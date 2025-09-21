import { ReplaySubject, takeUntil, tap, map as rxjsMap, filter, delay, retryWhen, debounceTime, BehaviorSubject, take, startWith, of, last, from, map, Observable, interval, takeWhile, timer, concatMap, Subject, EMPTY, defer, merge } from "rxjs";
import { CustomVectorSource } from "../../../helper/carto.helper";
import { Instance, Extent as GIROExtent, Map as Giro3DMap, OLUtils, OrbitControls, tile, LayerUpdateState, WorkerPool, BaseMessageMap } from "../../giro-3d-module";
import { Box3, Box3Helper, BoxGeometry, Camera, CylinderGeometry, DoubleSide, Fog, Group, InstancedBufferAttribute, InstancedBufferGeometry, Material, Matrix4, Mesh, MeshBasicMaterial, NearestFilter, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Raycaster, ReplaceStencilOp, ShaderMaterial, Sphere, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3 } from "three";
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent";
import { CartoHelper } from "../../../helper/carto.helper";
import { Projection, transform } from "ol/proj";
import { Coordinate, Feature, GeoJSON, Geometry, Point, VectorSourceEvent } from "../../ol-module";
import { containsCoordinate, containsExtent, Extent, getBottomLeft, intersects, type Extent as OLExtent } from 'ol/extent';
import { createXYZ } from "ol/tilegrid";
import { fromOpenLayerEvent } from "../../shared/class/fromOpenLayerEvent";
import Flatbush from "flatbush";
import { FeaturesStoreService } from "../../data/store/features.store.service";
import { AppInjector } from '../../../helper/app-injector.helper'
import { getUid } from "ol";
import { CustomInstancedBufferGeometry, PointMesh } from "../custom-mesh";
import { mergeFloat32 } from "../utils";
import { DataOSMLayer } from "../../../helper/type";
import { distinctUntilChanged, exhaustMap, finalize, shareReplay, switchMap, throttleTime, withLatestFrom, zip } from "rxjs/operators";
import { createListElevationWorker, ElevationFeature, getCapabilities, ListElevationMessageMap, ListElevationsMessageType } from "../elevation/pool";
import Vec2 from "../math/vector2";
import RenderFeature from "ol/render/Feature";
import { StreamWorkerPool } from "../worker-pool";
import RBush from "ol/structs/rbush";
import { collectTransferables, PointFeatureByExtent, PointProcessingMessageMap, PointProcessingMessageType, RequestPointProcessing, RequestUpdatePointBuildingHeigh, UpdatePointBuildingHeighMessageMap, UpdatePointBuildingHeightMessageType } from "./type";
import { setTimeout } from "timers";
import { AbstractPointsTile, PointsTile } from "./meshes";
import { parse } from "path";


function createPointProcessingWorker() {
    return new Worker(new URL("./point.worker.ts", import.meta.url), {
        type: 'module',
        name: 'PointProcessing',
    });
};

function createUpdatePointBuildingHeightWorker() {
    return new Worker(new URL("./update-point-building-height.worker.ts", import.meta.url), {
        type: 'module',
        name: 'UpdatePointBuildingHeight',
    });
};




const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmp2Vec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()

type TileSetMap<M extends AbstractPointsTile = PointsTile> = new () => M;

export abstract class AbstractPointsLayer<T extends AbstractPointsTile> {
    protected loadedExtentsRtree_ = new RBush();
    _tileSets: Map<string, T> = new Map<string, T>();

    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);

    protected instance: Instance
    protected map: Giro3DMap
    private controls: OrbitControls
    protected camera: PerspectiveCamera
    protected couche: DataOSMLayer

    protected destroyedInstancedMesh$: ReplaySubject<boolean>;

    protected loader: TextureLoader = new TextureLoader();

    protected vectorSource: CustomVectorSource

    protected elevationWorker: WorkerPool<ListElevationsMessageType, ListElevationMessageMap> | null
    protected pointProcessingWorker: StreamWorkerPool<PointProcessingMessageType, PointProcessingMessageMap>
    protected updatePointBuildingHeightWorker: WorkerPool<UpdatePointBuildingHeightMessageType, UpdatePointBuildingHeighMessageMap> = new WorkerPool<UpdatePointBuildingHeightMessageType, UpdatePointBuildingHeighMessageMap>({ createWorker: createUpdatePointBuildingHeightWorker });

    pointGroup: Group = new Group()

    // protected loaded_features_count = 0

    protected material: ShaderMaterial
    protected capabilities: any

    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {
        this.pointProcessingWorker = new StreamWorkerPool<PointProcessingMessageType, PointProcessingMessageMap>({ createWorker: createPointProcessingWorker });

        this.couche = couche
        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls



        this.camera = this.instance.view.camera as PerspectiveCamera


        if (!couche["destroyedInstancedMesh$"]) {
            couche["destroyedInstancedMesh$"] = new ReplaySubject(1);
        }
        this.destroyedInstancedMesh$ = couche["destroyedInstancedMesh$"]

        this.pointGroup.userData = {
            isLayer: true,
            name: couche.nom,
            couche_id: couche.properties.couche_id
        }

        this.instance.add(this.pointGroup)
        this.pointGroup.renderOrder = 2


        // remove the mesh if this instance is destroyed
        this.destroyedInstancedMesh$.pipe(
            tap(() => {
                // this.featuresStoreService.removeLayerVectorSource(couche.properties.couche_id)
                this.instance.remove(this.pointGroup)
                for (const key in this._tileSets) {
                    if (Object.prototype.hasOwnProperty.call(this._tileSets, key)) {
                        const element = this._tileSets.get(key);
                        element.dispose()
                    }
                }
            }),
            take(1)
        ).subscribe()

        this.vectorSource = this.getVectorSource()



        this.featuresStoreService.newBuildingHieghtLoaded.pipe(
            debounceTime(1000),
            takeUntil(this.destroyedInstancedMesh$),
            // filter(buildingsHeights => buildingsHeights.size > 0),
            switchMap(() => {
                return of(this.updateFeatureZWithBuildingHeight())
            })
        ).subscribe()

        this.initialiseFeatures(min_z)

        this.getMaterial().subscribe((material) => {
            this.material = material
        })
    }

    initialiseFeatures(min_z: number) {
        const tileGrid = createXYZ({ tileSize: 512 })
        const strategy = tile(tileGrid)
        const elevationCapabilities$ = from(getCapabilities()).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        elevationCapabilities$.subscribe((caps) => {
            this.capabilities = caps
        })
        let isLoading = false
        merge(this.getMaterial(), elevationCapabilities$, fromInstanceGiroEvent(this.instance, "after-camera-update")).pipe(
            // withLatestFrom(elevationCapabilities$),
            // update material quaternion uniform
            tap(() => {
                for (let index = 0; index < this.pointGroup.children.length; index++) {
                    const pointTile = this.pointGroup.children[index] as PointsTile
                    pointTile.afterCameraUpdate(this.camera)

                }
                // stickMaterial.uniforms.uRotationOnZAxisMatrix.value = new Matrix4().makeRotationZ(this.camera.rotation.z)
            }),
            debounceTime(100),
            takeUntil(this.destroyedInstancedMesh$),
            filter(() => this.pointGroup.visible),
            rxjsMap((instanceCamera) => {
                return CartoHelper.getZAndMapWith(
                    this.map,
                    this.instance.view.camera as PerspectiveCamera,
                    this.controls
                )
            }),
            filter((zAndMapWith) => zAndMapWith[0] > min_z),
            map((zAndMapWith) => {
                const controlTarget = (this.map.instance.view.controls as OrbitControls).target
                const mapExtent = GIROExtent.fromCenterAndSize("EPSG:3857", { x: controlTarget.x, y: controlTarget.y }, 10000, 10000)

                return [mapExtent, zAndMapWith] as [GIROExtent, [number, number]]
            }),
            // distinctUntilChanged((prev, next) => {
            //     return prev[0].centerAsVector2().distanceTo(next[0].centerAsVector2()) < 100
            // }),

            tap((parameter: [GIROExtent, [number, number]]) => {
                // if (isLoading) {
                //     return EMPTY
                // }
                // return of(zAndMapWith).pipe(finalize(() => {
                const zAndMapWith = parameter[1]
                const mapExtent = parameter[0]
                isLoading = true

                if (mapExtent == undefined) {
                    throw "Could not compute the map extent";
                }

                const olExtent = OLUtils.toOLExtent(mapExtent);
                const targetProjection = new Projection({ code: "EPSG:3857" });
                let mapWith = zAndMapWith[1]
                const minZoomResolution = tileGrid.getResolution(min_z)
                const zoom12Resolution = tileGrid.getResolution(12)
                // let target_resolution = mapWith / this.map["_instance"].domElement.width



                const extentsToLoad = strategy(olExtent, minZoomResolution, targetProjection);
                const extentsNotAlreadyLoaded = extentsToLoad.filter((extent) => {
                    const extentBottomLeftCoordinate = getBottomLeft(extent)
                    const alreadyLoaded = this.loadedExtentsRtree_.forEachInExtent(
                        extent,

                        function (object) {
                            //@ts-expect-error
                            return containsExtent(object.extent, extent);
                        }
                    )

                    return !alreadyLoaded && !this._tileSets.has(extentBottomLeftCoordinate[0] + "_" + extentBottomLeftCoordinate[1])
                })

                if (extentsNotAlreadyLoaded.length > 0) {
                    // this.loadedExtentsRtree_.insert(extent_, { extent: extent_.slice() });
                    const extentsAtZoom12 = []
                    for (let index = 0; index < extentsNotAlreadyLoaded.length; index++) {
                        const extent_ = extentsNotAlreadyLoaded[index];
                        this.loadedExtentsRtree_.insert(extent_, { extent: extent_.slice() });
                        extentsAtZoom12.push(...strategy(extent_, zoom12Resolution, targetProjection))
                    }


                    // console.log(extentsAtZoom16.length, "points tile to load")


                    try {
                        const data: RequestPointProcessing = {
                            type: 'fetch',
                            capabilities: this.capabilities,
                            buildingBuffer: this.featuresStoreService.buildingHeightFlatBushIndex?.buffer,
                            buildingIndex: this.featuresStoreService.buildingHeightFlatBushIndex?.index,
                            tileFlatIndexBuildingHeight: this.featuresStoreService.tileFlatIndexBuildingHeight,
                            data: {
                                extents: extentsAtZoom12,
                                baseUrl: this.couche.url,
                                identifiants: this.couche.identifiant.join(","),
                                resolution: zoom12Resolution,
                                projection: "EPSG:3857"
                            }
                        }


                        this.pointProcessingWorker.queue("PointProcessing", data).addEventListener('message', ((e) => {
                            //@ts-expect-error
                            const data = e.data.payload.data as PointFeatureByExtent[]

                            this.addFeaturesInScene(data)
                        }))
                    } catch (error) {
                        throw error
                    }



                }


                isLoading = false


            }),
            retryWhen((errors) => {
                return errors.pipe(
                    tap(val => console.error(val)),
                    delay(300),
                )
            }),
        ).subscribe()


    }

    makeVisible() {
        this.pointGroup.visible = true
    }

    makeUnVisible() {
        this.pointGroup.visible = false
    }

    getVisible() {
        return this.pointGroup.visible
    }

    getVectorSource() {
        return new CustomVectorSource({
            format: new GeoJSON({ "featureProjection": "EPSG:4326" }),
            url: (bbox) => {
                return `${this.couche.url +
                    '?VERSION=1.1.0' +
                    '&SERVICE=WFS' +
                    '&request=GETFEATURE' +
                    '&typename=' + this.couche.identifiant.join(",") +
                    '&outputFormat=GeoJSON' +
                    '&SRSNAME=EPSG:3857' +
                    '&startIndex=0' +
                    '&bbox='
                    }${bbox.join(',')}`;
            },

            strategy: tile(createXYZ({ tileSize: 512 })),
            useSpatialIndex: true
        });
    }
    getPointGeometry() {
        // @ts-expect-error
        const geometry = new CustomInstancedBufferGeometry().copy(new PlaneGeometry(60, 60));
        // geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(new Float32Array([]), 3));
        return geometry
    }

    getStickMaterial() {
        const material = new ShaderMaterial({
            // depthTest: false,
            // depthWrite: false,
            // side: DoubleSide,
            // depthFunc: GreaterDepth,
            vertexShader: `
                attribute vec4 aInstancePosition;
    
                void main(){
    
                // 60 is the width of the plane geometry here
                // float scaleFactor = (cameraPosition.z * 60.0 * 5.0 / 1000.0 / 1000.0);
                // if (scaleFactor < 0.13){
                //   scaleFactor = 0.13;
                // }
                
                // vec3 positionZ = position;
    
                // vec3 scalePos = position * scaleFactor;
                // vec3 newPosition =( vec4(position, 1.0) * uRotationOnZAxisMatrix).xyz;
                
                vec3 newPosition =position;

                if (position.z > 1.0){
                    newPosition.z = aInstancePosition.a;
                }else{
                    newPosition.z = 0.0;
                }
                vec3 pos =  vec3(aInstancePosition) + newPosition;
    
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                
                }
            `,
            fragmentShader: `
              varying vec2 vUv;
              void main(){
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              }
            `,
            uniforms: {
                // uGroupPosition: { value: tmpVec3.set(0, 0, 0) },
                // uRotationOnZAxisMatrix: { value: new Matrix4().makeRotationZ(this.camera.rotation.z) }
            },
        }
        )
        return material
    }

    getStickGeometry() {
        // @ts-expect-error
        const geometry = new CustomInstancedBufferGeometry().copy(new CylinderGeometry(0.4, 0.4, 100, 16));
        geometry.rotateX(Math.PI / 2)
        // geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(new Float32Array([]), 3));
        return geometry

    }

    getPointsTile(coordinate: Vec2, tile: TileSetMap<T>, tile_size = 30000) {
        // const tilePosition = new Vector2(Math.ceil(coordinate.x / tile_size) * tile_size,
        //     Math.ceil(coordinate.y / tile_size) * tile_size)
        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        if (this._tileSets.has(tile_key)) {
            console.error("tile already created")
            return this._tileSets.get(tile_key)
        }


        return this.createNewTile(tile, tile_key, tilePosition.x, tilePosition.y)
    }

    createNewTile(tile: TileSetMap<T>, tile_key, x, y) {
        const newBuildingTile = new tile()
        newBuildingTile.couche_id = this.couche.properties.couche_id
        newBuildingTile.key = tile_key
        newBuildingTile.position.set(
            x, y, 0
        )

        newBuildingTile.updateMatrixWorld()
        newBuildingTile.updateMatrix()



        newBuildingTile.addPointMesh(
            this.getPointGeometry(), this.material, this.camera
        )

        newBuildingTile.addStickMesh(
            this.getStickGeometry(), this.getStickMaterial()
        )

        this.pointGroup.add(newBuildingTile)

        this._tileSets.set(tile_key, newBuildingTile)
        return newBuildingTile
    }

    // async addElevation(features: Feature<Point>[]) {

    //     const featuresForElevation: Array<ElevationFeature> = features.map((feature, index) => {
    //         const properties = feature.getProperties()
    //         delete properties["geometry"]
    //         return {
    //             "properties": properties,
    //             "center": feature.getGeometry().getCoordinates(),
    //             "geometryType": "Point",
    //             "index": index
    //         }
    //         // const transformCoordinate = transform(feature.getGeometry().getCoordinates(), this.map.extent.crs, "IGNF:WGS84G")
    //         // const coordinate_with_index: [number, number, number] = [transformCoordinate[0], transformCoordinate[1], index]
    //         // return coordinate_with_index
    //     })


    //     if (this.elevationWorker == undefined) {
    //         this.elevationWorker = new WorkerPool({ createWorker: createListElevationWorker });
    //     }

    //     return getCapabilities().then(async (capabilities) => {
    //         const result = await this.elevationWorker.queue('ListElevation', { "capabilities": capabilities, "features": featuresForElevation, geometryType: "Point" });
    //         result.map((featureWithElevation) => {
    //             features[featureWithElevation.index].setProperties(featureWithElevation.properties)
    //         })
    //         // if (transformCoordinates.length != Array.from(elevations.values()).length) {
    //         //     console.warn(
    //         //         "Toutes élévations n'ont pas été trouvées pour les points",
    //         //     )
    //         // }
    //         for (let index = 0; index < features.length; index++) {
    //             const properties = features[index].getProperties()
    //             if (properties["elevation"] == undefined || properties["elevation"] == -Infinity) {
    //                 console.warn('Elevation de d un point non trouvée')
    //             }
    //         }
    //         return features
    //     })

    // }

    abstract updateFeatureZWithBuildingHeight(): Promise<void>
    abstract addFeaturesInScene(featuresByExtent: PointFeatureByExtent[]): void
    // abstract addFeaturesInMesh(extents: OLExtent): void
    abstract getMaterial(): Observable<ShaderMaterial>

}

export class PointsLayer extends AbstractPointsLayer<PointsTile> {

    private OSMIDProperites: Map<number, {
        properties: { [key: string]: any },
        coordinate: Coordinate
    }> = new Map<number, {
        properties: { [key: string]: any },
        coordinate: Coordinate
    }>()

    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {
        super(map, couche, min_z)

        this.featuresStoreService.addCustomVectorSource(couche.properties.couche_id, this.getFeatureFromOSMId.bind(this))
        this.destroyedInstancedMesh$.pipe(
            tap(() => {
                this.featuresStoreService.removeCustomVectorSource(couche.properties.couche_id)
            }),
            take(1)
        ).subscribe()
    }

    getFeatureFromOSMId(osmId: number) {
        const properties = this.OSMIDProperites.get(osmId)
        if (properties == undefined) {
            return
        }

        const feature = new Feature(new Point(properties.coordinate))
        feature.setProperties(properties.properties)
        return feature

    }


    override async updateFeatureZWithBuildingHeight() {
        // const featureBox3dList: Array<Box3> = []
        if (this.featuresStoreService.newBuildingsExtentsLoaded.length == 0) {
            return
        }
        const payload = this.pointGroup.children.filter((child: PointsTile) => {
            return this.featuresStoreService.newBuildingsExtentsLoaded.some((extent) => {
                return intersects(extent, child.extent)
            })
        }).map((child: PointsTile) => {
            const mesh = child.meshes.pointMesh
            const stickMesh = child.stickMeshes.stickMesh
            return {
                "mesh": mesh.geometry.attributes.aInstancePosition.array as Float32Array,
                "stickMesh": stickMesh.geometry.attributes.aInstancePosition.array as Float32Array,
                "meshElevation": mesh.geometry.attributes.aInstanceElevation.array as Float32Array,
                "tileCoordinates": child.position.toArray(),
                "tileKey": child.key,
            }
        })
        // console.log(this.pointGroup.children.length, payload.length, "to sync")
        if (payload.length == 0) {
            return
        }
        this.featuresStoreService.clearNewBuildingExtentLoaded()
        const data: RequestUpdatePointBuildingHeigh = {
            type: "",
            buildingBuffer: this.featuresStoreService.buildingHeightFlatBushIndex.buffer,
            buildingIndex: this.featuresStoreService.buildingHeightFlatBushIndex.index,
            tileFlatIndexBuildingHeight: this.featuresStoreService.tileFlatIndexBuildingHeight,
            "data": payload
        }

        this.updatePointBuildingHeightWorker.queue("UpdatePointBuildingHeight", data).then((e) => {
            for (let index = 0; index < e.data.length; index++) {
                const element = e.data[index];
                const pointTile = this.pointGroup.children.find((child: PointsTile) => {
                    return child.key == element.tileKey
                }) as PointsTile

                if (pointTile == undefined) {
                    continue
                }
                const mesh = pointTile.meshes.pointMesh
                const stickMesh = pointTile.stickMeshes.stickMesh
                mesh.geometry.attributes.aInstancePosition = new InstancedBufferAttribute(element.mesh, 3);
                stickMesh.geometry.attributes.aInstancePosition = new InstancedBufferAttribute(element.stickMesh, 4);
                mesh.geometry.attributes.aInstancePosition.needsUpdate = true
                stickMesh.geometry.attributes.aInstancePosition.needsUpdate = true
            }
        })
        // 

        // for (let meshIndex = 0; meshIndex < this.pointGroup.children.length; meshIndex++) {
        //     const pointTile = this.pointGroup.children[meshIndex] as PointsTile

        //     const mesh = pointTile.meshes.pointMesh
        //     const stickMesh = pointTile.stickMeshes.stickMesh

        //     for (let index = 0; index < mesh.geometry.attributes.aInstancePosition.count; index++) {
        //         const worldFeaturePosition = tmpVec3.set(
        //             mesh.geometry.attributes.aInstancePosition.getX(index),
        //             mesh.geometry.attributes.aInstancePosition.getY(index),
        //             mesh.geometry.attributes.aInstancePosition.getZ(index),
        //         ).add(pointTile.position)

        //         const altitude = await this.featuresStoreService.getBuildingHeightAtPoint(new Vec2(worldFeaturePosition.x, worldFeaturePosition.y))
        //         let z = 20
        //         if (altitude.ok) {
        //             z = altitude.data
        //         }
        //         const elevation = mesh.geometry.attributes.aInstanceElevation.getX(index)

        //         mesh.geometry.attributes.aInstancePosition.setZ(index, z + elevation)
        //         stickMesh.geometry.attributes.aInstancePosition.setW(index, z + elevation)

        //         // featureBox3dList.push(tmpBox3.set(
        //         //     tmpVec3.set(
        //         //         mesh.geometry.attributes.aInstancePosition.getX(index),
        //         //         mesh.geometry.attributes.aInstancePosition.getY(index),
        //         //         0
        //         //     ),
        //         //     tmpVec3.set(
        //         //         mesh.geometry.attributes.aInstancePosition.getX(index),
        //         //         mesh.geometry.attributes.aInstancePosition.getY(index),
        //         //         z
        //         //     )
        //         // ))

        //     }
        //     mesh.updateMatrix()
        //     stickMesh.updateMatrix()
        //     pointTile.updateMatrixWorld()


        //     mesh.geometry.attributes.aInstancePosition.needsUpdate = true
        //     stickMesh.geometry.attributes.aInstancePosition.needsUpdate = true

        //     // this.featuresStoreService.addLayerFeatureBox3dList(
        //     //     this.couche.properties.couche_id, featureBox3dList
        //     // )
        // }

    }



    addFeaturesInScene(featuresByExtent: PointFeatureByExtent[]) {
        const t0 = performance.now();

        for (let index = 0; index < featuresByExtent.length; index++) {
            const element = featuresByExtent[index];
            if (element.features.length == 0) continue


            for (let i = 0; i < element.features.length; i++) {
                const feature = element.features[i];


                this.OSMIDProperites.set(feature.properties.osm_id, feature)
            }

            const pointTile = this.getPointsTile(
                new Vec2(element.tileBottomLeft[0], element.tileBottomLeft[1]),
                PointsTile
            )
            pointTile.extent = element.extent
            pointTile.osmIdsFeatureIndex = element.osmIdsFeatureIndex
            pointTile.featureIndexOsmId = element.featureIndexOsmId

            const mesh = pointTile.meshes.pointMesh
            const stickMesh = pointTile.stickMeshes.stickMesh
            const pointGeometry = this.getPointGeometry()
            const stickGeometry = this.getStickGeometry()

            pointGeometry.instanceCount = element.features.length
            stickGeometry.instanceCount = element.features.length



            pointGeometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(element.instancePositions, 3));
            pointGeometry.setAttribute("aFeatureUid", new InstancedBufferAttribute(element.featureIds, 1));
            pointGeometry.setAttribute("aInstanceElevation", new InstancedBufferAttribute(element.instanceElevations, 1));
            stickGeometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(element.instanceStickPositions, 4));

            tmpBox3.setFromArray(element.boundingBoxMinMax)
            tmpBox3.getBoundingSphere(tmpSphere)

            pointGeometry.boundingBox = tmpBox3.clone()
            pointGeometry.boundingSphere = tmpSphere.clone()
            pointGeometry.instanceBoundingSphere = tmpSphere.clone()

            stickGeometry.boundingBox = tmpBox3.clone()
            stickGeometry.boundingSphere = tmpSphere.clone()
            stickGeometry.instanceBoundingSphere = tmpSphere.clone()

            mesh.geometry.dispose()
            stickMesh.geometry.dispose()

            mesh.geometry = pointGeometry
            stickMesh.geometry = stickGeometry

            mesh.updateMatrix()
            stickMesh.updateMatrix()

            pointTile.updateMatrixWorld();
        }
        this.instance.notifyChange([this.camera])
        const t1 = performance.now();
        // console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`, featuresByExtent.length);
    }



    getTexture(): Observable<{
        [key: string]: Texture;
    }> {
        return from(this.loader.loadAsync(this.couche.cercle_icon)).pipe(
            last(),
            map((texture) => {
                texture.colorSpace = SRGBColorSpace;
                texture.magFilter = NearestFilter
                texture.generateMipmaps = false;
                texture.minFilter = NearestFilter;
                return { texture }
            })
        )
    }

    getMaterial() {
        return this.getTexture().pipe(
            last(),
            map((texture) => {
                return new ShaderMaterial({
                    // depthTest: false,
                    // depthWrite: false,
                    // side: DoubleSide,
                    // fog: true,
                    vertexShader: `
                        uniform vec4 quaternion;
                        uniform vec3 uGroupPosition;
                        uniform int uFeatureUidSelected;

        
                        attribute vec3 aInstancePosition;
                        attribute int aFeatureUid;
                
                        varying vec2 vUv;
                        flat varying int vFeatureUid;

                
                        vec3 qtransform( vec4 q, vec3 v ){ 
                            return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
                        } 
                
                        void main(){

                            vFeatureUid = aFeatureUid;

                            // 60 is the width of the plane geometry here
                            float scaleFactor = (cameraPosition.z * 60.0 * 5.0 / 1000.0 / 1000.0);
                            if (scaleFactor < 0.13){
                            scaleFactor = 0.13;
                            }

                            if (uFeatureUidSelected == vFeatureUid){
                                scaleFactor = scaleFactor+scaleFactor/3.0;
                            }
                            
                            vec3 scalePos = position * scaleFactor;
                            vec3 pos = qtransform(quaternion, scalePos) + aInstancePosition ;
                
                            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0);
                            gl_Position.z -= 60.0*8.0*scaleFactor;
                            vUv = uv;
                            
                        
                        }
                        `,
                    fragmentShader: `
                        uniform sampler2D uTexture;
                        uniform int uFeatureUidSelected;

                        flat varying int vFeatureUid;
                        varying vec2 vUv;
                        void main(){
                            vec4 textureColor = texture2D(uTexture, vUv);
                            if (textureColor.a != 1.0){
                            discard;
                            }
                            gl_FragColor = textureColor;
                            if (uFeatureUidSelected == vFeatureUid){
                                gl_FragColor = gl_FragColor * vec4(1.0, 0.0, 0.0, 0.4);
                            }   
                        }
                        `,
                    uniforms: {
                        uTexture: { value: texture.texture },
                        uGroupPosition: { value: tmpVec3.set(0, 0, 0) },
                        fogColor: { value: (this.instance.scene.fog as Fog).color },
                        fogNear: { value: (this.instance.scene.fog as Fog).near },
                        fogFar: { value: (this.instance.scene.fog as Fog).far },
                        quaternion: { value: this.camera.quaternion.clone().invert() },
                    },
                }
                )

            })
        )

    }


}