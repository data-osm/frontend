import { Coordinate } from "ol/coordinate";
import { AlwaysDepth, Box3, Color, CurveType, CylinderGeometry, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LineBasicMaterial, Material, Matrix4, Mesh, MeshStandardMaterial, NeverDepth, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3, TubeGeometry, CatmullRomCurve3, DoubleSide, InstancedBufferGeometry, Float32BufferAttribute, BufferGeometry, Uint16BufferAttribute, BufferAttribute, Sphere, ShaderLib, UniformsUtils } from "three";
import { Instance, Map as Giro3DMap, OrbitControls, OLUtils, tile, Coordinates } from "../../giro-3d-module";
import { CartoHelper, CustomVectorSource } from "../../../helper/carto.helper";
import { filter, ReplaySubject, startWith, take, takeUntil, tap, map as rxjsMap, retryWhen, delay, debounceTime } from "rxjs";
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent";
import { Projection } from "ol/proj";
import { createXYZ } from "ol/tilegrid";
import { Feature, GeoJSON, Geometry, getCenter, LineString, MultiLineString, VectorSourceEvent } from "../../ol-module";
import { Line2, LineGeometry, LineMaterial, LineSegments2, LineSegmentsGeometry } from "three/examples/jsm/Addons";
import { LinearRing } from "ol/geom";
import { CustomInstancedBufferGeometry, SelectableMesh } from "../custom-mesh";
import { getUid } from "ol";
import { mergeFloat32 } from "../utils";
import { fromOpenLayerEvent } from "../../shared/class/fromOpenLayerEvent";
import { NonMorphable } from "@svgdotjs/svg.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { createPositionBuffer, ensureLineStringNotClosed, ensureMultiLineStringNotClosed, subdivideLineString, subdivideMultiLineString } from "./utils";
import { DataOSMLayer } from "../../../helper/type";
import { FeaturesStoreService } from "../../data/store/features.store.service";
import { AppInjector } from "../../../helper/app-injector.helper";


const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmp2Vec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()
const BUILDING_TILE_SIZE = 30000

class LineTile extends Group {
    // frustumCulled: boolean = false
    readonly isFeatureTile = true;
    readonly type = 'LineTile';
    couche_id: number
    key: string

    lineMesh: SelectableMesh
    // 

    addLineMesh(mesh: SelectableMesh) {
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

export class TubeLineStringLayer {
    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);

    private instance: Instance
    private map: Giro3DMap
    private controls: OrbitControls
    private camera: PerspectiveCamera
    private couche: DataOSMLayer
    private destroyedInstancedMesh$: ReplaySubject<boolean>;
    private vectorSource: CustomVectorSource
    private loaded_features_count = 0

    private _tileSets: Map<string, LineTile> = new Map()
    lineGroup: Group = new Group()
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
                this.featuresStoreService.removeLayerVectorSource(couche.properties.couche_id)
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

        this.vectorSource = this.getVectorSource()
        this.featuresStoreService.addLayerVectorSource(
            couche.properties.couche_id, this.vectorSource
        )

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
            filter((event: VectorSourceEvent<Geometry>) => this.vectorSource.getFeatures().length > this.loaded_features_count),
            tap((event: VectorSourceEvent<Geometry>) => {
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

    getLineTile(coordinate: Vector2, prefix_key: string = "") {
        const tilePosition = new Vector2(Math.ceil(coordinate.x / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE,
            Math.ceil(coordinate.y / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE)

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
            new SelectableMesh(this.getLineGeometry(), material)
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

    addFeaturesInMesh(new_features: Array<Feature> = []) {

        // "GAZ", "TEL", "ELEC", "ASS", "AEP", "MR" 
        // console.log(new Set(features.map((f) => f.getProperties()["Reseau"])))
        const NetWorkTye = {
            "ASS": {
                "color": "#81300c",
                "zOffset": 0,
            },
            "GAZ": {
                "color": "#fff401",
                "zOffset": 1.5,
            },
            "TEL": {
                "color": "#008000",
                "zOffset": 2,
            },
            "ELEC": {
                "color": "#ff0000",
                "zOffset": 2.5,
            },
            "AEP": {
                "color": "#0000ff",
                "zOffset": 3,
            },
            "MR": {
                "color": "#ffc0cb",
                "zOffset": 3.5,
            },
            "CC": {
                "color": "#800080",
                "zOffset": 4,
            }
        }
        let features = this.vectorSource.getFeatures()
        // .filter((f) => f.getProperties()["name"] == "Ligne 2 : Nation → Porte Dauphine")
        // let features = this.vectorSource.getFeatures().filter((f) => f.getProperties()["name"] == "Ligne 2 : Nation → Porte Dauphine" && (f.getGeometry() as LineString).getFlatCoordinates().length > 50)
        this.loaded_features_count = features.length

        const lineTileFeaturesMap: {
            [key: string]:
            {
                features: Array<Feature>,
                instancePositions: Array<Float32Array>,
                featureNetwork: {}
            }
        } = {}
        // console.log(features)
        for (let index = 0; index < features.length; index++) {
            const feature = features[index];

            const featureRadius: number = feature.getProperties()["Diametre"] ? feature.getProperties()["Diametre"] / 100 / 2 : 0.1

            const featureNetworkName: string = feature.getProperties()["Reseau"]
            const featureNetwork = NetWorkTye[featureNetworkName]
            // console.log(featureNotUsed, feature.getProperties()["Abandon"], "http://localhost:4200/map?profil=15&layers=736,62,layer&pos=258592.9,6247314,63,258616.2,6247315.6,16")

            let geometry = feature.getGeometry() as LineString | MultiLineString | LinearRing
            // console.log(new GeoJSON().writeFeatureObject(feature, { featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" }))
            let coordinates: Array<Coordinate>
            if (geometry.getType() == "MultiLineString") {
                // alert("MultiLineString detected")
                ensureMultiLineStringNotClosed(geometry as MultiLineString)
                const newMultiLineString = subdivideMultiLineString(geometry as MultiLineString, 1)
                coordinates = [].concat(...newMultiLineString.getCoordinates())

            } else {
                ensureLineStringNotClosed(geometry as LineString)
                geometry = subdivideLineString((geometry as LineString), 1)
                coordinates = geometry.getCoordinates()
            }


            const lineCentroid = getCenter(geometry.getExtent())

            let pointTile = this.getLineTile(tmpVec2.set(
                lineCentroid[0], lineCentroid[1]
            ), featureNetworkName)


            if (!lineTileFeaturesMap[pointTile.key]) {
                lineTileFeaturesMap[pointTile.key] = {
                    features: [],
                    instancePositions: [],
                    featureNetwork: featureNetwork,
                }
            }


            lineTileFeaturesMap[pointTile.key].features.push(
                feature
            );

            let flatDeep = (arr) => {
                return arr.reduce((acc, val) => acc.concat(val.length != 2 ? flatDeep(val) : [val]), []);
            };
            const instancePosition = createPositionBuffer(
                // // @ts-expect-error
                coordinates,
                {
                    ignoreZ: true,
                    origin: new Vector3(pointTile.position.x, pointTile.position.y, -1 * featureNetwork["zOffset"]),
                }

            )
            // if (instancePosition.length < 6) {

            //     console.log(instancePosition)
            // }
            lineTileFeaturesMap[pointTile.key].instancePositions.push(
                instancePosition
            )
        }

        for (const key in lineTileFeaturesMap) {
            if (Object.prototype.hasOwnProperty.call(lineTileFeaturesMap, key)) {
                const element = lineTileFeaturesMap[key];
                const pointTile = this._tileSets.get(key)

                const mesh = pointTile.lineMesh
                // const featureUid = new Int32Array(element.features.length)
                // element.features.map((feature, index) => {
                //     featureUid[index] = parseInt(getUid(feature))
                // })

                let maxTubeVertices = 0;
                let maxTubeIndexes = 0;
                const tubeGeometries: Array<TubeGeometry> = element.instancePositions.map((instancePosition, index) => {
                    const points: Array<Vector3> = []
                    const feature = element.features[index]
                    const featureNotUsed: boolean = feature.getProperties()["Abandon"] === 0 ? false : true
                    const featureRadius: number = feature.getProperties()["Diametre"] ? feature.getProperties()["Diametre"] / 100 / 2 : 0.1

                    for (let i = 0; i < instancePosition.length; i += 3) {

                        points.push(
                            new Vector3(
                                instancePosition[i],
                                instancePosition[i + 1],
                                instancePosition[i + 2]
                            )
                        )
                    }

                    // if (instancePosition.length == 6) {
                    // }
                    const path = new CatmullRomCurve3(points, false)
                    const tubeGeometry = new TubeGeometry(path, 64, featureRadius, 8 * 2, false)

                    // Get the 'uv' attribute from the geometry
                    const uvAttribute = tubeGeometry.attributes.uv;

                    // Create the visibility attribute
                    const visibility = new Float32Array(uvAttribute.count);
                    const featureUid = new Int32Array(uvAttribute.count)

                    // Define dash pattern parameters (in terms of u coordinate)
                    const dashLength = 0.1; // Fraction of the total length (e.g., 10% of the tube)
                    const gapLength = 0.03; // Fraction of the total length (e.g., 3% of the tube)
                    const totalLength = dashLength + gapLength;
                    for (let i = 0; i < uvAttribute.count; i++) {
                        featureUid[i] = parseInt(getUid(element.features[index]))
                    }
                    if (featureNotUsed) {
                        for (let i = 0; i < uvAttribute.count; i++) {
                            // Get the 'u' coordinate (progress along the tube from 0 to 1)
                            const u = uvAttribute.getX(i);

                            // Calculate position within the dash-gap pattern
                            const mod = (u % totalLength) / totalLength;

                            // Set visibility: 0.0 for dash, 1.0 for gap
                            visibility[i] = mod < (dashLength / totalLength) ? 0.0 : 1.0;

                        }
                    }
                    // console.log(featureUid, index, element.features)
                    tubeGeometry.setAttribute('aPositionToHide', new BufferAttribute(visibility, 1));
                    tubeGeometry.setAttribute('aFeatureUid', new BufferAttribute(featureUid, 1));

                    maxTubeVertices = tubeGeometry.attributes.position.count + maxTubeVertices
                    maxTubeIndexes = tubeGeometry.getIndex().count + maxTubeIndexes

                    return tubeGeometry
                })



                const instancedGeometry = mergeGeometries(tubeGeometries)
                instancedGeometry.computeBoundingBox()
                instancedGeometry.computeBoundingSphere()
                // tmpBox3.setFromArray(instancedGeometry.attributes.position.array)

                mesh.geometry.dispose()
                mesh.geometry = instancedGeometry
                // mesh.geometry.boundingBox = tmpBox3
                // mesh.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)

                mesh.material.uniforms.diffuse = { value: new Color(element.featureNetwork["color"]) }
                // mesh.material.color = new Color(element.featureNetwork["color"])

                mesh.updateMatrix()


                pointTile.updateMatrixWorld();


                // console.log(mesh.geometry.attributes)

            }

        }

        this.instance.notifyChange(this.camera)


    }
    getLineGeometry() {
        return new TubeGeometry()
    }

    getLineMaterial() {
        const material = new ShaderMaterial({
            uniforms: UniformsUtils.clone(ShaderLib['standard'].uniforms), // Clone standard uniforms
            vertexShader: ShaderLib['standard'].vertexShader,
            fragmentShader: ShaderLib['standard'].fragmentShader,
            lights: true, // Enable lighting
            side: DoubleSide
        });
        material.uniforms.roughness.value = 0.5;
        material.uniforms.metalness.value = 0.5;
        // material.uniforms.uFeatureUidSelected = { value: undefined }

        material.onBeforeCompile = (shader) => {


            shader.vertexShader = shader.vertexShader.replace('#include <batching_pars_vertex>', `
                #include <batching_pars_vertex>
                attribute int aFeatureUid;
                attribute float aPositionToHide;

                varying float vPositionToHide;
                varying float vFeatureUid;
            `)

            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vPositionToHide = aPositionToHide;
                vFeatureUid = float(aFeatureUid);
            `)

            shader.fragmentShader = shader.fragmentShader.replace('uniform vec3 diffuse;', `
                uniform vec3 diffuse;
                uniform float uFeatureUidSelected;
                
                varying float vPositionToHide;
                varying float vFeatureUid;
            `)

            shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
                #include <dithering_fragment>
                if (vPositionToHide == 1.0){
                    discard;
                }
                if (uFeatureUidSelected == vFeatureUid){
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `)

        }

        return material
    }
}
