import { Coordinate } from "ol/coordinate";
import { AlwaysDepth, Box3, Color, CurveType, CylinderGeometry, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LineBasicMaterial, Material, Matrix4, Mesh, MeshStandardMaterial, NeverDepth, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3, TubeGeometry, CatmullRomCurve3, DoubleSide, InstancedBufferGeometry, Float32BufferAttribute, BufferGeometry, Uint16BufferAttribute, BufferAttribute, Sphere, ShaderLib, UniformsUtils } from "three";
import { Instance, Map as Giro3DMap, OrbitControls, OLUtils, tile, Coordinates, Extent as GIROExtent } from "../../giro-3d-module";
import { CartoHelper, CustomVectorSource } from "../../../helper/carto.helper";
import { filter, ReplaySubject, startWith, take, takeUntil, tap, map as rxjsMap, retryWhen, delay, debounceTime, shareReplay, from, merge, buffer } from "rxjs";
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent";
import { Projection } from "ol/proj";
import { createXYZ } from "ol/tilegrid";
import { Feature, GeoJSON, Geometry, getCenter, LineString, MultiLineString, VectorSourceEvent } from "../../ol-module";
import { Line2, LineGeometry, LineMaterial, LineSegments2, LineSegmentsGeometry } from "three/examples/jsm/Addons";
import { LinearRing, Polygon } from "ol/geom";
import { CustomInstancedBufferGeometry, SelectableLineMesh } from "../custom-mesh";
import { getUid } from "ol";
import { mergeFloat32 } from "../utils";
import { fromOpenLayerEvent } from "../../shared/class/fromOpenLayerEvent";
import { NonMorphable } from "@svgdotjs/svg.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { addElevationToLines, createPositionBuffer, ensureLinesAreClosed, ensureLineStringNotClosed, ensureMultiLineStringNotClosed, subdivideLineString, subdivideMultiLineString } from "./utils";
import { DataOSMLayer } from "../../../helper/type";
import { FeaturesStoreService } from "../../data/store/features.store.service";
import { AppInjector } from "../../../helper/app-injector.helper";
import RBush from "ol/structs/rbush";
import { getCapabilities } from "../elevation/pool";
import { containsExtent, Extent, getBottomLeft } from "ol/extent";
import { createLineProcessingWorker, LineFeatureByExtent, LineProcessingMessageMap, LineProcessingMessageType, RequestLineProcessing } from "./type";
import { StreamWorkerPool } from "../worker-pool";
import Vec2 from "../math/vector2";
import { temp } from "three/src/nodes/TSL";
import { LineTile } from "./meshes";
import { fromExtent } from "ol/geom/Polygon";

const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmp2Vec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()
const BUILDING_TILE_SIZE = 30000



export interface FeatureInTile<T> {
    features: Array<Feature>,
    instancePositions: Array<Float32Array>,
    group: { "color": string } & T
}





export abstract class TubeLineStringLayer<K> {
    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);

    protected instance: Instance
    protected map: Giro3DMap
    private controls: OrbitControls
    protected camera: PerspectiveCamera
    private couche: DataOSMLayer
    private destroyedInstancedMesh$: ReplaySubject<boolean>;
    protected loaded_features_count = 0

    protected _tileSets: Map<string, LineTile> = new Map()
    lineGroup: Group = new Group()

    protected loadedExtentsRtree_ = new RBush();
    private OSMIDProperites: Map<number, {
        properties: { [key: string]: any },
        geometryExtent: Extent
    }> = new Map<number, {
        properties: { [key: string]: any },
        geometryExtent: Extent
    }>()

    private capabilities: any

    protected lineProcessingWorker: StreamWorkerPool<LineProcessingMessageType, LineProcessingMessageMap> = new StreamWorkerPool<LineProcessingMessageType, LineProcessingMessageMap>({ createWorker: createLineProcessingWorker })

    abstract getLineMaterial(): ShaderMaterial
    // abstract initializeLineFeatureInTile(feature: Feature): FeatureInTile<K>

    abstract filterFeatureCondition(properties: { [x: string]: any; }): boolean
    abstract getFeatureId(properties: { [x: string]: any; }): number
    abstract groupFeatureBy(properties: { [x: string]: any; }): { "color": string, [key: string]: any }
    abstract getFeatureRadius(properties: { [x: string]: any; }): number
    abstract onGeometryCreated(geometry: TubeGeometry, properties: { [x: string]: any; }): void
    abstract getPointTileGroupByFromFeature(properties: { [x: string]: any; }): string


    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {
        this.couche = couche
        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.camera = this.instance.view.camera as PerspectiveCamera

        if (!couche["destroyedInstancedMesh$"]) {
            couche["destroyedInstancedMesh$"] = new ReplaySubject(1);
        }
        this.destroyedInstancedMesh$ = couche["destroyedInstancedMesh$"]

        this.lineGroup.userData = {
            isLayer: true,
            name: couche.nom,
            couche_id: couche.properties.couche_id
        }

        this.instance.add(this.lineGroup)

        // remove the mesh if this instance is destroyed
        this.destroyedInstancedMesh$.pipe(
            tap(() => {
                this.featuresStoreService.removeCustomVectorSource(couche.properties.couche_id)
                this.instance.remove(this.lineGroup)
                for (const key in this._tileSets) {
                    if (Object.prototype.hasOwnProperty.call(this._tileSets, key)) {
                        const element = this._tileSets.get(key);
                        element.dispose()
                    }
                }
            }),
            take(1)
        ).subscribe()

        this.featuresStoreService.addCustomVectorSource(couche.properties.couche_id, this.getFeatureFromOSMId.bind(this))

        this.initialiseFeatures(min_z)

    }

    getFeatureFromOSMId(osmId: number) {
        const properties = this.OSMIDProperites.get(osmId)
        if (properties == undefined) {
            return
        }

        const feature = new Feature(fromExtent(properties.geometryExtent))
        feature.setProperties(properties.properties)
        return feature

    }

    initialiseFeatures(min_z: number) {
        const tileGrid = createXYZ({ tileSize: 512 })
        const strategy = tile(tileGrid)

        const elevationCapabilities$ = from(getCapabilities()).pipe(shareReplay({ bufferSize: 1, refCount: true }), tap((caps) => {
            this.capabilities = caps
        }));

        merge(elevationCapabilities$, fromInstanceGiroEvent(this.instance, "after-camera-update")).pipe(
            startWith(this.instance),
            takeUntil(this.destroyedInstancedMesh$),
            filter(() => this.lineGroup.visible),
            filter(() => this.capabilities != undefined),
            // update material quaternion uniform
            tap(() => {
                for (let index = 0; index < this.lineGroup.children.length; index++) {
                    const pointTile = this.lineGroup.children[index] as LineTile
                    // pointTile.pointMesh.material.uniforms.quaternion.value.copy(this.camera.quaternion).invert()
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
                const controlTarget = (this.map.instance.view.controls as OrbitControls).target
                const mapExtent = GIROExtent.fromCenterAndSize("EPSG:3857", { x: controlTarget.x, y: controlTarget.y }, 1000, 1000)

                return [mapExtent, zAndMapWith] as [GIROExtent, [number, number]]
            }),
            tap((parameter: [GIROExtent, [number, number]]) => {
                const zAndMapWith = parameter[1]
                const mapExtent = parameter[0]

                if (mapExtent == undefined) {
                    throw "Could not compute the map extent";
                }

                const olExtent = OLUtils.toOLExtent(mapExtent);
                const targetProjection = new Projection({ code: "EPSG:3857" });

                const minZoomResolution = tileGrid.getResolution(min_z)
                const zoom12Resolution = tileGrid.getResolution(min_z)

                const extentsToLoad = strategy(olExtent, minZoomResolution, targetProjection);
                const extentsNotAlreadyLoaded = extentsToLoad.filter((extent) => {
                    const extentBottomLeftCoordinate = getBottomLeft(extent)
                    const alreadyLoaded = this.loadedExtentsRtree_.forEachInExtent(
                        extent,

                        function (object) {
                            return containsExtent(object["extent"] as Extent, extent);
                        }
                    )

                    return !alreadyLoaded && !this._tileSets.has(extentBottomLeftCoordinate[0] + "_" + extentBottomLeftCoordinate[1])
                })
                if (extentsNotAlreadyLoaded.length > 0) {
                    const extentsAtZoom12 = []
                    for (let index = 0; index < extentsNotAlreadyLoaded.length; index++) {
                        const extent_ = extentsNotAlreadyLoaded[index];
                        this.loadedExtentsRtree_.insert(extent_, { extent: extent_.slice() });
                        extentsAtZoom12.push(...strategy(extent_, zoom12Resolution, targetProjection))
                    }
                    // console.log(extentsAtZoom12.length, "extents to load")
                    try {

                        const data: RequestLineProcessing = {
                            type: "fetch",
                            capabilities: this.capabilities,
                            lineProcessingTool: "tube",
                            filterFeatureCondition: this.filterFeatureCondition.toString(),
                            getPointTileGroupByFromFeature: this.getPointTileGroupByFromFeature.toString(),
                            getFeatureRadius: this.getFeatureRadius.toString(),
                            onGeometryCreated: this.onGeometryCreated.toString(),
                            getFeatureId: this.getFeatureId.toString(),
                            groupFeatureBy: this.groupFeatureBy.toString(),
                            data: {
                                extents: extentsAtZoom12,
                                baseUrl: this.couche.url,
                                identifiants: this.couche.identifiant.join(","),
                                resolution: zoom12Resolution,
                                projection: "EPSG:3857"
                            }
                        }
                        this.lineProcessingWorker.queue("lineProcessing", data).addEventListener('message', (e) => {
                            const data = e.data["payload"].data as LineFeatureByExtent[]
                            this.loadFeaturesInScene(data)
                        })
                    }

                    catch (error) {
                        throw error
                    }
                }
            }),

            retryWhen((errors) => {
                return errors.pipe(
                    tap(val => console.warn(val)),
                    delay(300),
                )
            }),
        ).subscribe()
    }
    makeVisible() {
        this.lineGroup.visible = true
    }

    makeUnVisible() {
        this.lineGroup.visible = false
    }

    getVisible() {
        return this.lineGroup.visible
    }

    getLineTile(tilePosition: Vec2, prefix_key: string = "") {

        const tile_key = tilePosition.x + "_" + tilePosition.y + "_" + prefix_key

        if (this._tileSets.has(tile_key)) {

            return this._tileSets.get(tile_key)
        }

        const newLineTile = new LineTile()
        newLineTile.couche_id = this.couche.properties.couche_id
        newLineTile.key = tile_key
        newLineTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )

        newLineTile.updateMatrixWorld()
        newLineTile.updateMatrix()

        const material = this.getLineMaterial()
        newLineTile.addLineMesh(
            new SelectableLineMesh(this.getLineGeometry(), material)
        )

        this.lineGroup.add(newLineTile)

        this._tileSets.set(tile_key, newLineTile)
        return newLineTile
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


    loadFeaturesInScene(tiles: LineFeatureByExtent[]) {
        for (let index = 0; index < tiles.length; index++) {
            const tile = tiles[index];

            const lineTIle = this.getLineTile(new Vec2(tile.extentBottomLeft[0], tile.extentBottomLeft[1]), tile.prefixKey)
            lineTIle.osmIdsFeatureIndex = tile.osmIdsFeatureIndex
            lineTIle.featureIndexOsmId = tile.featureIndexOsmId
            tile.features.forEach((feature) => {
                this.OSMIDProperites.set(feature.osm_id, {
                    properties: feature,
                    geometryExtent: feature.geometryExtent
                })
            })
            const mesh = lineTIle.lineMesh

            const geometry = new BufferGeometry()
            if (tile.geometryIndex) {

                geometry.setIndex(new BufferAttribute(tile.geometryIndex.array, tile.geometryIndex.itemSize, tile.geometryIndex.normalized))
            }
            tile.finalGeometryJson.forEach((geometryJson) => {
                geometry.setAttribute(geometryJson.key, new BufferAttribute(geometryJson.array, geometryJson.itemSize, geometryJson.normalized))
            })

            tmpBox3.setFromArray(tile.boundingBoxMinMax)
            tmpBox3.getBoundingSphere(tmpSphere)

            geometry.boundingBox = tmpBox3.clone()
            geometry.boundingSphere = tmpSphere.clone()

            mesh.geometry.dispose()

            mesh.geometry = geometry
            const color = new Color(tile.group.color)
            mesh.material.uniforms.diffuse = { value: color }
            mesh.updateMatrix()
            lineTIle.updateMatrixWorld();

        }
    }


    // addFeaturesInMesh(new_features) {
    //     const features = this.getFeatures(this.vectorSource)
    //     ensureLinesAreClosed(features)
    //     this.loaded_features_count = features.length
    //     const lineTileFeaturesMap: { [key: string]: FeatureInTile<K> } = {}

    //     addElevationToLines(features, this.map.extent.crs).then((featuresWithZ) => {
    //         for (let index = 0; index < featuresWithZ.length; index++) {
    //             const featureWithZ = featuresWithZ[index];
    //             const geometry = featureWithZ.getGeometry()
    //             const lineCentroid = getCenter(geometry.getExtent())

    //             let pointTile = this.getLineTile(tmpVec2.set(
    //                 lineCentroid[0], lineCentroid[1]
    //             ), this.getPointTileGroupByFromFeature(featureWithZ))

    //             if (!lineTileFeaturesMap[pointTile.key]) {
    //                 lineTileFeaturesMap[pointTile.key] = this.initializeLineFeatureInTile(featureWithZ)
    //             }

    //             lineTileFeaturesMap[pointTile.key].features.push(
    //                 featureWithZ
    //             );

    //             let coordinates: Array<[number, number, number]> = [];
    //             if (geometry instanceof LinesStringWithZ) {
    //                 coordinates = geometry.coordinatesWithZ
    //             } else if (geometry instanceof MultiLineStringWithZ) {
    //                 coordinates = geometry.coordinatesWithZ.reduce((acc, val) => acc.concat(val), [])
    //             }
    //             // console.log(coordinates)
    //             const instancePosition = createPositionBuffer(
    //                 coordinates,
    //                 {
    //                     ignoreZ: false,
    //                     origin: new Vector3(pointTile.position.x, pointTile.position.y, -3),
    //                 }
    //             )

    //             lineTileFeaturesMap[pointTile.key].instancePositions.push(
    //                 instancePosition
    //             )
    //         }

    //         for (const key in lineTileFeaturesMap) {
    //             if (Object.prototype.hasOwnProperty.call(lineTileFeaturesMap, key)) {
    //                 const element = lineTileFeaturesMap[key];
    //                 const pointTile = this._tileSets.get(key)
    //                 const mesh = pointTile.lineMesh

    //                 // let maxTubeVertices = 0;
    //                 // let maxTubeIndexes = 0;
    //                 const tubeGeometries: Array<TubeGeometry> = element.instancePositions.map((instancePosition, index) => {
    //                     const points: Array<Vector3> = []
    //                     const feature = element.features[index]
    //                     const featureRadius: number = this.getFeatureRadius(feature)

    //                     for (let i = 0; i < instancePosition.length; i += 3) {

    //                         points.push(
    //                             new Vector3(
    //                                 instancePosition[i],
    //                                 instancePosition[i + 1],
    //                                 instancePosition[i + 2]
    //                             )
    //                         )
    //                     }
    //                     const path = new CatmullRomCurve3(points, false)
    //                     const tubeGeometry = new TubeGeometry(path, 64, featureRadius, 8 * 2, false)

    //                     // Get the 'uv' attribute from the geometry
    //                     const uvAttribute = tubeGeometry.attributes.uv;

    //                     // Create the visibility attribute
    //                     const featureUid = new Int32Array(uvAttribute.count)


    //                     for (let i = 0; i < uvAttribute.count; i++) {
    //                         featureUid[i] = parseInt(getUid(element.features[index]))
    //                     }

    //                     // console.log(featureUid, index, element.features)
    //                     tubeGeometry.setAttribute('aFeatureUid', new BufferAttribute(featureUid, 1));
    //                     this.onGeometryCreated(tubeGeometry, feature)

    //                     // maxTubeVertices = tubeGeometry.attributes.position.count + maxTubeVertices
    //                     // maxTubeIndexes = tubeGeometry.getIndex().count + maxTubeIndexes

    //                     return tubeGeometry
    //                 })

    //                 const instancedGeometry = mergeGeometries(tubeGeometries)
    //                 instancedGeometry.computeBoundingBox()
    //                 instancedGeometry.computeBoundingSphere()
    //                 // tmpBox3.setFromArray(instancedGeometry.attributes.position.array)

    //                 mesh.geometry.dispose()
    //                 mesh.geometry = instancedGeometry
    //                 // mesh.geometry.boundingBox = tmpBox3
    //                 // mesh.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)

    //                 mesh.material.uniforms.diffuse = { value: new Color(element.group.color) }

    //                 mesh.updateMatrix()

    //                 pointTile.updateMatrixWorld();
    //             }
    //         }
    //     })
    // }

    getLineGeometry() {
        return new TubeGeometry()
    }


}
