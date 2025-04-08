import { ReplaySubject, takeUntil, tap, map as rxjsMap, filter, delay, retryWhen, debounceTime, BehaviorSubject, take, startWith, of, last, from, map, Observable, interval, takeWhile, timer, concatMap } from "rxjs";
import { CustomVectorSource } from "../../helper/carto.helper";
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, tile, LayerUpdateState } from "../giro-3d-module";
import { Box3, Box3Helper, BoxGeometry, CylinderGeometry, Fog, Group, InstancedBufferAttribute, InstancedBufferGeometry, Material, Matrix4, Mesh, MeshBasicMaterial, NearestFilter, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Raycaster, ReplaceStencilOp, ShaderMaterial, Sphere, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3 } from "three";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { CartoHelper } from "../../helper/carto.helper";
import { Projection } from "ol/proj";
import { Feature, GeoJSON, Geometry, Point, VectorSourceEvent } from "../ol-module";
import { getBottomLeft, type Extent as OLExtent } from 'ol/extent';
import { createXYZ } from "ol/tilegrid";
import { fromOpenLayerEvent } from "../shared/class/fromOpenLayerEvent";
import Flatbush from "flatbush";
import { FeaturesStoreService } from "../data/store/features.store.service";
import { AppInjector } from '../../helper/app-injector.helper'
import { getUid } from "ol";
import { CustomInstancedBufferGeometry, PointMesh } from "./custom-mesh";
import { mergeFloat32 } from "./utils";
import { DataOSMLayer } from "../../helper/type";
import { throttleTime, zip } from "rxjs/operators";


export abstract class AbstractPointsTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'PointTile';
    couche_id: number
    key: string

    abstract addPointMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial): void
    abstract addStickMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial): void
    abstract dispose(): void
    abstract afterCameraUpdate(camera: PerspectiveCamera): void
}



export class PointsTile extends AbstractPointsTile {
    // frustumCulled: boolean = false
    readonly isFeatureTile = true;
    readonly type = 'PointTile';
    couche_id: number
    key: string

    meshes: {
        pointMesh: PointMesh,
    } = {
            pointMesh: undefined,
        }

    stickMeshes: {
        stickMesh: Mesh<CustomInstancedBufferGeometry, ShaderMaterial, Object3DEventMap>
    } = {
            stickMesh: undefined
        }

    // pointMesh: PointMesh
    // stickMesh: Mesh<CustomInstancedBufferGeometry, ShaderMaterial, Object3DEventMap>

    addPointMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial) {
        for (const key in this.meshes) {
            this.meshes[key] = new PointMesh(geometry.clone(), material.clone())
            this.meshes[key].updateMatrixWorld()
            this.meshes[key].updateMatrix()
            this.add(this.meshes[key])
            this.meshes[key].userData.type = "pointMesh"
            this.meshes[key].userData.couche_id = this.couche_id
            // as the mesh have multiple features, frustum will not hide some feature or not. 
            //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
            this.meshes[key].frustumCulled = false
        }
    }

    addStickMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial) {
        for (const key in this.stickMeshes) {
            this.stickMeshes[key] = new Mesh(geometry.clone(), material.clone())
            this.stickMeshes[key].updateMatrixWorld()
            this.stickMeshes[key].updateMatrix()
            this.add(this.stickMeshes[key])
            this.stickMeshes[key].userData.type = "stickMesh"
            this.stickMeshes[key].userData.couche_id = this.couche_id
            // as the mesh have multiple features, frustum will not hide some feature or not. 
            //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
            this.stickMeshes[key].frustumCulled = false
        }

        // this.stickMesh = new Mesh(geometry, material)
        // this.stickMesh.updateMatrixWorld()
        // this.stickMesh.updateMatrix()
        // this.add(this.stickMesh)
        // this.stickMesh.userData.type = "stickMesh"
        // this.pointMesh.userData.couche_id = this.couche_id
        // // as the mesh have multiple features, frustum will not hide some feature or not. 
        // //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
        // this.stickMesh.frustumCulled = false
    }
    afterCameraUpdate(camera: PerspectiveCamera) {
        for (const key in this.meshes) {
            this.meshes[key].material.uniforms.quaternion.value.copy(camera.quaternion).invert()
        }

    }

    dispose() {
        for (const key in this.meshes) {
            this.meshes[key].material.dispose()
            this.meshes[key].material.dispose()
            this.meshes[key].geometry.dispose()
            this.meshes[key].clear()
        }

        for (const key in this.stickMeshes) {
            this.stickMeshes[key].material.dispose()
            this.stickMeshes[key].material.dispose()
            this.stickMeshes[key].geometry.dispose()
            this.stickMeshes[key].clear()
        }

        this.clear()
    }

}



const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmp2Vec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()

type TileSetMap<M extends AbstractPointsTile = PointsTile> = new () => M;

export abstract class AbstractPointsLayer<T extends AbstractPointsTile> {

    _tileSets: Map<string, T> = new Map<string, T>();

    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);

    protected instance: Instance
    private map: Giro3DMap
    private controls: OrbitControls
    protected camera: PerspectiveCamera
    private buildingsHeights$: BehaviorSubject<Map<number, number>>
    private buildingsIndex$: BehaviorSubject<Flatbush>
    protected couche: DataOSMLayer

    private destroyedInstancedMesh$: ReplaySubject<boolean>;

    protected loader: TextureLoader = new TextureLoader();

    protected vectorSource: CustomVectorSource



    pointGroup: Group = new Group()

    // protected loaded_features_count = 0

    protected material: ShaderMaterial

    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {

        this.couche = couche
        this.map = map
        this.buildingsHeights$ = this.featuresStoreService.buildingsHeights$
        this.buildingsIndex$ = this.featuresStoreService.buildingsIndex$
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
                this.featuresStoreService.removeLayerVectorSource(couche.properties.couche_id)
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
        this.featuresStoreService.addLayerVectorSource(
            couche.properties.couche_id, this.vectorSource
        )


        this.buildingsHeights$.pipe(
            debounceTime(1000),
            takeUntil(this.destroyedInstancedMesh$),
            filter(buildingsHeights => buildingsHeights.size > 0),
            tap(() => {
                this.updateFeatureZWithBuildingHeight()
            })
        ).subscribe()

        this.getMaterial().pipe(
            take(1),
            tap((material) => {
                this.material = material
                this.initialiseFeatures(min_z)
            })
        ).subscribe()

    }

    initialiseFeatures(min_z: number) {
        fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
            debounceTime(100),
            startWith(this.instance),
            takeUntil(this.destroyedInstancedMesh$),
            filter(() => this.pointGroup.visible),
            // update material quaternion uniform
            tap(() => {
                for (let index = 0; index < this.pointGroup.children.length; index++) {
                    const pointTile = this.pointGroup.children[index] as PointsTile
                    pointTile.afterCameraUpdate(this.camera)

                }
                // stickMaterial.uniforms.uRotationOnZAxisMatrix.value = new Matrix4().makeRotationZ(this.camera.rotation.z)
            }),
            rxjsMap((instanceCamera) => {
                return CartoHelper.getZAndMapWith(
                    this.map,
                    this.instance.view.camera as PerspectiveCamera,
                    this.controls
                )
            }),
            filter((zAndMapWith) => zAndMapWith[0] > min_z),
            rxjsMap((zAndMapWith) => {
                const mapExtent = CartoHelper.getMapExtent(this.map)

                if (mapExtent == undefined) {
                    throw "Could not compute the map extent";
                }



                const olExtent = OLUtils.toOLExtent(mapExtent);
                const targetProjection = new Projection({ code: "EPSG:3857" });
                let mapWith = zAndMapWith[1]
                let target_resolution = mapWith / this.map["_instance"].domElement.width


                // ask to OL to load features
                this.vectorSource.loadFeatures(olExtent, target_resolution, targetProjection)


            }),
            retryWhen((errors) => {
                return errors.pipe(
                    tap(val => console.warn(val)),
                    delay(300),
                )
            }),
        ).subscribe()

        fromOpenLayerEvent(this.vectorSource, "featuresloadend").pipe(
            takeUntil(this.destroyedInstancedMesh$),
            concatMap((event) =>
                // Turn each incoming event into an observable
                // that waits 1 second, then emits the event.
                of(event).pipe(
                    delay(100),
                    tap((evt) => {
                        // console.log("Processing event:");
                        //@ts-expect-error
                        this.addFeaturesInMesh(evt.extent);
                    })
                )
            )
            // tap((event) => {
            //     // setTimeout(() => {
            //     const ts = Date.now();
            //     //@ts-expect-error
            //     this.addFeaturesInMesh(event.extent)

            //     // }, 5000);
            // })
        ).subscribe()
        // .pipe(
        //     takeUntil(this.destroyedInstancedMesh$),
        //     debounceTime(500),
        //     filter((event: VectorSourceEvent<Geometry>) => this.vectorSource.getFeatures().length > this.loaded_features_count),
        //     tap((event: VectorSourceEvent<Geometry>) => {
        //         // this.addFeaturesInMesh(event.features)

        //     }),
        // ).subscribe()
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

    getPointsTile(coordinate: Vector2, tile: TileSetMap<T>, tile_size = 30000) {
        // const tilePosition = new Vector2(Math.ceil(coordinate.x / tile_size) * tile_size,
        //     Math.ceil(coordinate.y / tile_size) * tile_size)
        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        if (this._tileSets.has(tile_key)) {
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
            this.getPointGeometry(), this.material
        )

        newBuildingTile.addStickMesh(
            this.getStickGeometry(), this.getStickMaterial()
        )

        this.pointGroup.add(newBuildingTile)

        this._tileSets.set(tile_key, newBuildingTile)
        return newBuildingTile
    }

    abstract updateFeatureZWithBuildingHeight(): void
    abstract addFeaturesInMesh(extents: OLExtent): void
    abstract getMaterial(): Observable<ShaderMaterial>

}

export class PointsLayer extends AbstractPointsLayer<PointsTile> {


    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {
        super(map, couche, min_z)

    }


    updateFeatureZWithBuildingHeight() {
        // const featureBox3dList: Array<Box3> = []
        for (let meshIndex = 0; meshIndex < this.pointGroup.children.length; meshIndex++) {
            const pointTile = this.pointGroup.children[meshIndex] as PointsTile

            const mesh = pointTile.meshes.pointMesh
            const stickMesh = pointTile.stickMeshes.stickMesh

            for (let index = 0; index < mesh.geometry.attributes.aInstancePosition.count; index++) {
                const worldFeaturePosition = tmpVec3.set(
                    mesh.geometry.attributes.aInstancePosition.getX(index),
                    mesh.geometry.attributes.aInstancePosition.getY(index),
                    mesh.geometry.attributes.aInstancePosition.getZ(index),
                ).add(pointTile.position)

                let z = this.featuresStoreService.getBuildingHeightAtPoint(tmpVec2.fromArray(
                    [
                        worldFeaturePosition.x,
                        worldFeaturePosition.y
                    ]
                ))
                mesh.geometry.attributes.aInstancePosition.setZ(index, z)
                stickMesh.geometry.attributes.aInstancePosition.setW(index, z)

                // featureBox3dList.push(tmpBox3.set(
                //     tmpVec3.set(
                //         mesh.geometry.attributes.aInstancePosition.getX(index),
                //         mesh.geometry.attributes.aInstancePosition.getY(index),
                //         0
                //     ),
                //     tmpVec3.set(
                //         mesh.geometry.attributes.aInstancePosition.getX(index),
                //         mesh.geometry.attributes.aInstancePosition.getY(index),
                //         z
                //     )
                // ))

            }
            mesh.updateMatrix()
            stickMesh.updateMatrix()
            pointTile.updateMatrixWorld()


            mesh.geometry.attributes.aInstancePosition.needsUpdate = true
            stickMesh.geometry.attributes.aInstancePosition.needsUpdate = true

            // this.featuresStoreService.addLayerFeatureBox3dList(
            //     this.couche.properties.couche_id, featureBox3dList
            // )
        }

    }

    getAllFeaturesPerTile(features: Feature<Geometry>[], tileCenter: Vector2): {
        [key: string]:
        {
            features: Array<Feature>,
            instancePositions: Array<Float32Array>
            instanceStickPositions: Array<Float32Array>
        }
    } {

        const pointTileFeaturesMap: {
            [key: string]:
            {
                features: Array<Feature>,
                instancePositions: Array<Float32Array>
                instanceStickPositions: Array<Float32Array>
            }
        }
            = {}
        const pointTile = this.getPointsTile(
            tileCenter,
            PointsTile
        )

        for (let index = 0; index < features.length; index++) {
            const feature = features[index];
            const geometry = feature.getGeometry() as Point
            const coordinate = geometry.getCoordinates();

            if (!pointTileFeaturesMap[pointTile.key]) {
                pointTileFeaturesMap[pointTile.key] = {
                    features: [],
                    instancePositions: [],
                    instanceStickPositions: [],
                }
            }

            const instancePosition = new Float32Array(3);
            const instanceStickPosition = new Float32Array(4);

            pointTileFeaturesMap[pointTile.key].features.push(
                feature
            )



            pointTileFeaturesMap[pointTile.key].instancePositions.push(
                instancePosition
            )

            pointTileFeaturesMap[pointTile.key].instanceStickPositions.push(
                instanceStickPosition
            )


            const buildingHeightAtFeature = this.featuresStoreService.getBuildingHeightAtPoint(tmpVec2.fromArray(
                [
                    coordinate[0],
                    coordinate[1]
                ]
            ))

            instancePosition[0] = coordinate[0] - pointTile.position.x
            instancePosition[1] = coordinate[1] - pointTile.position.y
            instancePosition[2] = buildingHeightAtFeature

            instanceStickPosition[0] = coordinate[0] - pointTile.position.x
            instanceStickPosition[1] = coordinate[1] - pointTile.position.y
            instanceStickPosition[2] = 0
            instanceStickPosition[3] = buildingHeightAtFeature

        }

        return pointTileFeaturesMap
    }

    addFeaturesInMesh(extent: OLExtent) {
        let features = this.vectorSource.getFeaturesInExtent(extent)
        if (features.length == 0) {
            return
        }
        const pointTileCenter = getBottomLeft(extent)

        const pointTileFeaturesMap = this.getAllFeaturesPerTile(features, new Vector2(pointTileCenter[0], pointTileCenter[1]))
        for (const key in pointTileFeaturesMap) {
            const element = pointTileFeaturesMap[key];
            const pointTile = this._tileSets.get(key)

            const mesh = pointTile.meshes.pointMesh
            const stickMesh = pointTile.stickMeshes.stickMesh
            const featureUid = new Int32Array(element.features.length)
            element.features.map((feature, index) => {
                featureUid[index] = parseInt(getUid(feature))
            })

            const pointGeometry = this.getPointGeometry()
            const stickGeometry = this.getStickGeometry()

            pointGeometry.instanceCount = element.features.length
            stickGeometry.instanceCount = element.features.length

            pointGeometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(mergeFloat32(element.instancePositions), 3));
            pointGeometry.setAttribute("aFeatureUid", new InstancedBufferAttribute(featureUid, 1));
            stickGeometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(mergeFloat32(element.instanceStickPositions), 4));

            tmpBox3.setFromArray(pointGeometry.attributes.aInstancePosition.array)
            tmpBox3.expandByScalar(200)
            const tileBox3 = tmpBox3
            const tileSphere = tileBox3.getBoundingSphere(tmpSphere)

            pointGeometry.boundingBox = tileBox3
            pointGeometry.boundingSphere = tileSphere

            stickGeometry.boundingBox = tileBox3
            stickGeometry.boundingSphere = tileSphere

            mesh.geometry.dispose()
            stickMesh.geometry.dispose()

            mesh.geometry = pointGeometry
            stickMesh.geometry = stickGeometry

            mesh.updateMatrix()
            stickMesh.updateMatrix()

            pointTile.updateMatrixWorld();


        }

        this.instance.notifyChange([this.camera])


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
                    fog: true,
                    vertexShader: `
                        uniform vec4 quaternion;
                        uniform vec3 uGroupPosition;
        
                        attribute vec3 aInstancePosition;
                
                        varying vec2 vUv;
                        // const float rotation = 0.0;
                
                        vec3 qtransform( vec4 q, vec3 v ){ 
                            return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
                        } 
                
                            void main(){
                
                            // 60 is the width of the plane geometry here
                            float scaleFactor = (cameraPosition.z * 60.0 * 5.0 / 1000.0 / 1000.0);
                            if (scaleFactor < 0.13){
                            scaleFactor = 0.13;
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
                        varying vec2 vUv;
                        void main(){
                            vec4 textureColor = texture2D(uTexture, vUv);
                            if (textureColor.a != 1.0){
                            discard;
                            }
                            gl_FragColor = textureColor;
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