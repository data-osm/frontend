import { Coordinate } from "ol/coordinate";
import { AlwaysDepth, Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, NeverDepth, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Points, ShaderMaterial, Vector2, Vector3 } from "three";
import { Instance, Map as Giro3DMap, OrbitControls, OLUtils, tile } from "../../giro-3d-module";
import { CartoHelper, CustomVectorSource, LinesStringWithZ, MultiLineStringWithZ } from "../../../helper/carto.helper";
import { filter, ReplaySubject, startWith, Observable, take, takeUntil, tap, map as rxjsMap, retryWhen, delay, debounceTime, of, last } from "rxjs";
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent";
import { Projection } from "ol/proj";
import { createXYZ } from "ol/tilegrid";
import { Feature, GeoJSON, Geometry, getCenter, LineString, MultiLineString, VectorSourceEvent, VectorEventType } from "../../ol-module";
import { Line2, LineGeometry, LineMaterial, LineSegments2, LineSegmentsGeometry } from "three/examples/jsm/Addons";
import { LinearRing } from "ol/geom";
import { CustomInstancedBufferGeometry } from "../custom-mesh";
import { getUid } from "ol";
import { mergeFloat32 } from "../utils";
import { fromOpenLayerEvent } from "../../shared/class/fromOpenLayerEvent";
import { NonMorphable } from "@svgdotjs/svg.js";
import { createPositionBuffer, subdivideLineString, ensureLineStringNotClosed, ensureMultiLineStringNotClosed, divideLineStringByLength, ensureContinuousLineString, addElevationToLines, ensureLinesAreClosed } from "./utils";
import { DataOSMLayer } from "../../../helper/type";
import Vec2 from "../math/vector2";
import { projectAndAddGeometry, RoadBuilder } from "./line-builder";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { VectorSourceEventTypes } from "ol/source/VectorEventType";
import { createListElevationWorker, getCapabilities, ListElevationMessageMap, ListElevationsMessageType } from "../elevation/pool";
import Vec3 from "../math/vector3";

const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmp2Vec3 = new Vector3()
const tmpBox3 = new Box3()
const BUILDING_TILE_SIZE = 30000

class LineTile extends Group {
    // frustumCulled: boolean = false
    readonly isFeatureTile = true;
    readonly type = 'LineTile';
    couche_id: number
    key: string

    lineMesh: Mesh
    // <CustomInstancedBufferGeometry, LineMaterial, Object3DEventMap>

    addLineMesh(mesh: Mesh) {
        mesh.updateMatrixWorld()
        mesh.updateMatrix()
        this.add(mesh)
        this.lineMesh = mesh
        this.lineMesh.userData.type = "lineMesh"
        this.lineMesh.userData.couche_id = this.couche_id
        // as the mesh have multiple features, frustum will not hide some feature or not. 
        //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
        this.lineMesh.frustumCulled = false
    }

    dispose() {
        this.clear()
    }

}

export abstract class FlatLineStringLayer {

    protected instance: Instance
    protected map: Giro3DMap
    protected controls: OrbitControls
    protected camera: PerspectiveCamera
    protected couche: DataOSMLayer
    protected destroyedInstancedMesh$: ReplaySubject<boolean>;
    protected vectorSource: CustomVectorSource
    private loaded_features_count = 0

    private _tileSets: Map<string, LineTile> = new Map()
    protected lineGroup: Group = new Group()
    protected material: ShaderMaterial | Material

    abstract getLineMaterial(): Observable<Material>

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

        this.instance.scene.add(this.lineGroup)

        // remove the mesh if this instance is destroyed
        this.destroyedInstancedMesh$.pipe(
            tap(() => {
                this.instance.scene.remove(this.lineGroup)
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
        this.getLineMaterial().pipe(
            take(1),
            tap((material) => {
                this.material = material
                this.initialiseFeatures(min_z)
            })
        ).subscribe()

    }

    initialiseFeatures(min_z: number) {
        fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
            startWith(this.instance),
            takeUntil(this.destroyedInstancedMesh$),
            filter(() => this.lineGroup.visible),
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
            // take(1),
            debounceTime(500),
            filter((event) => this.vectorSource.getFeatures().length > this.loaded_features_count),
            tap((event: VectorSourceEvent) => {

                // VectorSourceEvent<Geometry>
                // this.addFeaturesInMesh(event.features.filter((f) => f.getProperties()["name"] = "Ligne 2 : Nation → Porte Dauphine"))
                this.addFeaturesInMesh(event.features)

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

    getLineTile(coordinate: Vector2) {
        const tilePosition = new Vector2(Math.ceil(coordinate.x / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE,
            Math.ceil(coordinate.y / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE)
        const tile_key = tilePosition.x + "_" + tilePosition.y
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

        const mesh = new Mesh(this.getLineGeometry(), this.material)
        newLineTile.addLineMesh(
            mesh
        )
        mesh.onBeforeRender = () => {
            this.onBeforeMeshRender(mesh)
        }
        // newLineTile.lineMesh.onAfterRender = (r, s, c, geometry, m, g) => {
        //     console.log(geometry, "geometry")

        // }


        this.lineGroup.add(newLineTile)

        this._tileSets.set(tile_key, newLineTile)
        return newLineTile
    }

    onBeforeMeshRender(mesh: Mesh) {

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





    addFeaturesInMesh(new_features: Array<Feature> = []) {
        const features = this.vectorSource.getFeatures() as Feature<LineString | MultiLineString>[]
        ensureLinesAreClosed(features)

        this.loaded_features_count = features.length

        const lineTileFeaturesMap: {
            [key: string]:
            {
                features: Array<Feature<LinesStringWithZ | MultiLineStringWithZ>>,
                instancePositions: Array<Float32Array>
            }
        } = {}
        addElevationToLines(features, this.map.extent.crs).then((featuresWithZ) => {
            for (let index = 0; index < featuresWithZ.length; index++) {
                const featureWithZ = featuresWithZ[index];
                const geometry = featureWithZ.getGeometry()
                const lineCentroid = getCenter(geometry.getExtent())

                let pointTile = this.getLineTile(tmpVec2.set(
                    lineCentroid[0], lineCentroid[1]
                ))

                if (!lineTileFeaturesMap[pointTile.key]) {
                    lineTileFeaturesMap[pointTile.key] = {
                        features: [],
                        instancePositions: [],
                    }
                }

                lineTileFeaturesMap[pointTile.key].features.push(
                    featureWithZ
                );

                let coordinates: Array<[number, number, number]> = [];
                if (geometry instanceof LinesStringWithZ) {
                    coordinates = geometry.coordinatesWithZ
                } else if (geometry instanceof MultiLineStringWithZ) {
                    coordinates = geometry.coordinatesWithZ.reduce((acc, val) => acc.concat(val), [])
                }
                // console.log(coordinates)
                const instancePosition = createPositionBuffer(
                    coordinates,
                    {
                        ignoreZ: false,
                        origin: new Vector3(pointTile.position.x, pointTile.position.y, -3),
                    }

                )

                lineTileFeaturesMap[pointTile.key].instancePositions.push(
                    instancePosition
                )
            }

            for (const key in lineTileFeaturesMap) {
                if (Object.prototype.hasOwnProperty.call(lineTileFeaturesMap, key)) {
                    const element = lineTileFeaturesMap[key];
                    const pointTile = this._tileSets.get(key)

                    const mesh = pointTile.lineMesh
                    const featureUid = new Int32Array(element.features.length)
                    element.features.map((feature, index) => {
                        featureUid[index] = parseInt(getUid(feature))
                    })



                    const geometries: Array<BufferGeometry> = []

                    for (let index = 0; index < element.instancePositions.length; index++) {

                        const length = element.instancePositions[index].length - 3;
                        const point = new Float32Array(2 * length);
                        const vertices: Array<Vec3> = []
                        for (let i = 0; i < length; i += 3) {

                            point[2 * i] = element.instancePositions[index][i];
                            point[2 * i + 1] = element.instancePositions[index][i + 1];
                            point[2 * i + 2] = element.instancePositions[index][i + 2];

                            point[2 * i + 3] = element.instancePositions[index][i + 3];
                            point[2 * i + 4] = element.instancePositions[index][i + 4];
                            point[2 * i + 5] = element.instancePositions[index][i + 5];

                            const p1 = new Vec3(
                                point[2 * i],
                                point[2 * i + 1],
                                point[2 * i + 2]
                            )
                            const p2 = new Vec3(
                                point[2 * i + 3],
                                point[2 * i + 4],
                                point[2 * i + 5]
                            )
                            vertices.push(p1, p2)

                        }
                        const roadBuffer = new RoadBuilder(pointTile).build(
                            {
                                vertices: vertices,
                                width: 4.368129562747236,
                                uvFollowRoad: true,
                                uvScaleY: 4.368129562747236 * 4,
                                vertexAdjacentToStart: vertices[0].xy,
                                vertexAdjacentToEnd: vertices[vertices.length - 1].xy,

                            }
                        )

                        const roadProjectedGeometry = projectAndAddGeometry({
                            position: roadBuffer.position,
                            uv: roadBuffer.uv,
                            textureId: 1,
                        })
                        // console.log(roadProjectedGeometry.positionBuffer, "roadProjectedGeometry.positionBuffer");
                        const geometry = new BufferGeometry()
                        geometry.setAttribute("position", new BufferAttribute(roadProjectedGeometry.positionBuffer, 3))
                        geometry.setAttribute("normal", new BufferAttribute(roadProjectedGeometry.normalBuffer, 3))
                        geometry.setAttribute("uv", new BufferAttribute(roadProjectedGeometry.uvBuffer, 2))
                        geometries.push(geometry)

                    }

                    const newGeometry = mergeGeometries(geometries)

                    mesh.frustumCulled = false
                    mesh.geometry.dispose()
                    mesh.geometry = newGeometry


                    mesh.updateMatrix()
                    mesh.updateMatrixWorld()

                    pointTile.updateMatrixWorld();
                    this.instance.notifyChange(this.camera)

                }

            }


        })


        // for (let index = 0; index < features.length; index++) {
        //     const feature = features[index];
        //     let geometry = feature.getGeometry() as LineString
        //     // | MultiLineString | LinearRing
        //     // console.log(new GeoJSON().writeFeatureObject(feature, { featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" }))

        //     if (geometry.getType() == "MultiLineString") {
        //         // @ts-expect-error
        //         ensureMultiLineStringNotClosed(geometry)
        //     } else {
        //         // // @ts-expect-error
        //         ensureLineStringNotClosed(geometry)
        //     }
        //     // geometry = subdivideLineString((geometry as LineString), 6)
        //     // geometry = ensureContinuousLineString((geometry as LineString))
        //     // geometry = divideLineStringByLength((geometry as LineString), 2)
        //     const lineCentroid = getCenter(geometry.getExtent())

        //     let pointTile = this.getLineTile(tmpVec2.set(
        //         lineCentroid[0], lineCentroid[1]
        //     ))

        //     if (!lineTileFeaturesMap[pointTile.key]) {
        //         lineTileFeaturesMap[pointTile.key] = {
        //             features: [],
        //             instancePositions: [],
        //         }
        //     }


        //     lineTileFeaturesMap[pointTile.key].features.push(
        //         feature
        //     );

        //     let flatDeep = (arr) => {
        //         return arr.reduce((acc, val) => acc.concat(val.length != 2 ? flatDeep(val) : [val]), []);
        //     };
        //     const instancePosition = createPositionBuffer(
        //         // // @ts-expect-error
        //         geometry.getCoordinates(),
        //         {
        //             ignoreZ: true,
        //             origin: new Vector3(pointTile.position.x, pointTile.position.y, -3),
        //         }

        //     )

        //     lineTileFeaturesMap[pointTile.key].instancePositions.push(
        //         instancePosition
        //     )
        // }



    }
    getLineGeometry() {

        const geometry = new LineSegmentsGeometry();

        return geometry
    }

    // getLineMaterial(): Observable<Material> {
    //     return of(
    //         new MeshBasicMaterial()
    //         // new LineMaterial({
    //         //     depthTest: true,
    //         //     depthWrite: true,
    //         //     // depthFunc: LessDepth,
    //         //     color: "red",
    //         //     // color: feature.getProperties()["colour"] ? feature.getProperties()["colour"] : "red",
    //         //     linewidth: 0.01, // Notice the different case
    //         //     // vertexColors: true,
    //         //     // resolution: tmpVec2.set(window.innerWidth, window.innerHeight),
    //         //     // worldUnits: true,
    //         //     opacity: 0.5,
    //         //     transparent: true,
    //         // })
    //     ).pipe(
    //         last()
    //     )
    // }
}



