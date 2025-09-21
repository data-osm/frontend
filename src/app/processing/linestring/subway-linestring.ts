import { Coordinate } from "ol/coordinate";
import { AlwaysDepth, Box3, Color, CurveType, CylinderGeometry, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LineBasicMaterial, Material, Matrix4, Mesh, MeshStandardMaterial, NeverDepth, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3, TubeGeometry, CatmullRomCurve3, DoubleSide, InstancedBufferGeometry, Float32BufferAttribute, BufferGeometry, Uint16BufferAttribute, BufferAttribute, Sphere, ShaderLib, UniformsUtils } from "three";


import { FeatureInTile, TubeLineStringLayer } from "./tube-linestring";
import { Feature } from "ol";
import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import { CustomVectorSource } from "../../../helper/carto.helper";




interface FeatureInTileGroup {
    color: string
}
export class SubwayLineLineStringLayer extends TubeLineStringLayer<FeatureInTileGroup> {

    getPointTileGroupByFromFeature(properties) {

        return properties["name"]
    }

    groupFeatureBy(properties) {
        return {
            color: properties["colour"]
        }
    }

    getFeatureId(properties) {
        return properties["osm_id"] as number
    }

    // initializeLineFeatureInTile(feature: Feature) {
    //     return {
    //         features: [],
    //         instancePositions: [],
    //         group: {
    //             color: feature.getProperties()["colour"]
    //         },
    //     }
    // }

    getFeatureRadius(properties) {
        return 2
    }
    onGeometryCreated(geometry, properties) {

    }

    filterFeatureCondition(properties) {
        return properties["is_closed"] == false
    }

    // getFeatures(vectorSource: CustomVectorSource): Feature<LineString | MultiLineString>[] {
    //     return vectorSource.getFeatures().filter((f) => f.getProperties()["is_closed"] == false) as Feature<LineString | MultiLineString>[]
    // }

    // addFeaturesInMesh_(new_features: Array<Feature> = []) {


    //     let features = this.vectorSource.getFeatures().filter((f) => f.getProperties()["is_closed"] == false)
    //     // .filter((f) => f.getProperties()["name"] == "Ligne 2 : Nation → Porte Dauphine")
    //     // let features = this.vectorSource.getFeatures().filter((f) => f.getProperties()["name"] == "Ligne 2 : Nation → Porte Dauphine" && (f.getGeometry() as LineString).getFlatCoordinates().length > 50)
    //     this.loaded_features_count = features.length

    //     const lineTileFeaturesMap: FeatureInTile<{ color: string }> = {}

    //     // console.log(features)
    //     for (let index = 0; index < features.length; index++) {
    //         const feature = features[index];


    //         // const featureNetworkName: string = feature.getProperties()["Reseau"]
    //         // const featureNetwork = NetWorkTye[featureNetworkName]
    //         // console.log(featureNotUsed, feature.getProperties()["Abandon"], "http://localhost:4200/map?profil=15&layers=736,62,layer&pos=258592.9,6247314,63,258616.2,6247315.6,16")

    //         let geometry = feature.getGeometry() as LineString | MultiLineString | LinearRing
    //         // console.log(new GeoJSON().writeFeatureObject(feature, { featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" }))
    //         let coordinates: Array<Coordinate>
    //         if (geometry.getType() == "MultiLineString") {
    //             // alert("MultiLineString detected")
    //             ensureMultiLineStringNotClosed(geometry as MultiLineString)
    //             const newMultiLineString = subdivideMultiLineString(geometry as MultiLineString, 1)
    //             coordinates = [].concat(...newMultiLineString.getCoordinates())

    //         } else {
    //             ensureLineStringNotClosed(geometry as LineString)
    //             geometry = subdivideLineString((geometry as LineString), 1)
    //             coordinates = geometry.getCoordinates()
    //         }


    //         const lineCentroid = getCenter(geometry.getExtent())

    //         let pointTile = this.getLineTile(tmpVec2.set(
    //             lineCentroid[0], lineCentroid[1]
    //         ), feature.getProperties()["name"])


    //         if (!lineTileFeaturesMap[pointTile.key]) {
    //             lineTileFeaturesMap[pointTile.key] = {
    //                 features: [],
    //                 instancePositions: [],
    //                 group: {
    //                     color: feature.getProperties()["colour"],
    //                 },
    //             }
    //         }


    //         lineTileFeaturesMap[pointTile.key].features.push(
    //             feature
    //         );

    //         let flatDeep = (arr) => {
    //             return arr.reduce((acc, val) => acc.concat(val.length != 2 ? flatDeep(val) : [val]), []);
    //         };
    //         const instancePosition = createPositionBuffer(
    //             coordinates,
    //             {
    //                 ignoreZ: true,
    //                 origin: new Vector3(pointTile.position.x, pointTile.position.y, -1 * 1),
    //             }

    //         )
    //         // if (instancePosition.length < 6) {

    //         //     console.log(instancePosition)
    //         // }
    //         lineTileFeaturesMap[pointTile.key].instancePositions.push(
    //             instancePosition
    //         )
    //     }

    //     for (const key in lineTileFeaturesMap) {
    //         if (Object.prototype.hasOwnProperty.call(lineTileFeaturesMap, key)) {
    //             const element = lineTileFeaturesMap[key];
    //             const pointTile = this._tileSets.get(key)

    //             const mesh = pointTile.lineMesh
    //             // const featureUid = new Int32Array(element.features.length)
    //             // element.features.map((feature, index) => {
    //             //     featureUid[index] = parseInt(getUid(feature))
    //             // })

    //             let maxTubeVertices = 0;
    //             let maxTubeIndexes = 0;
    //             const tubeGeometries: Array<TubeGeometry> = element.instancePositions.map((instancePosition, index) => {
    //                 const points: Array<Vector3> = []
    //                 const feature = element.features[index]
    //                 // const featureNotUsed: boolean = feature.getProperties()["Abandon"] === 0 ? false : true
    //                 const featureRadius: number = 1

    //                 for (let i = 0; i < instancePosition.length; i += 3) {

    //                     points.push(
    //                         new Vector3(
    //                             instancePosition[i],
    //                             instancePosition[i + 1],
    //                             instancePosition[i + 2]
    //                         )
    //                     )
    //                 }

    //                 // if (instancePosition.length == 6) {
    //                 // }
    //                 const path = new CatmullRomCurve3(points, false)
    //                 const tubeGeometry = new TubeGeometry(path, 64, featureRadius, 8 * 2, false)

    //                 // Get the 'uv' attribute from the geometry
    //                 const uvAttribute = tubeGeometry.attributes.uv;

    //                 // Create the visibility attribute
    //                 const featureUid = new Int32Array(uvAttribute.count)

    //                 // Define dash pattern parameters (in terms of u coordinate)

    //                 for (let i = 0; i < uvAttribute.count; i++) {
    //                     featureUid[i] = parseInt(getUid(element.features[index]))
    //                 }

    //                 // console.log(featureUid, index, element.features)
    //                 tubeGeometry.setAttribute('aFeatureUid', new BufferAttribute(featureUid, 1));

    //                 maxTubeVertices = tubeGeometry.attributes.position.count + maxTubeVertices
    //                 maxTubeIndexes = tubeGeometry.getIndex().count + maxTubeIndexes

    //                 return tubeGeometry
    //             })



    //             const instancedGeometry = mergeGeometries(tubeGeometries)
    //             instancedGeometry.computeBoundingBox()
    //             instancedGeometry.computeBoundingSphere()
    //             // tmpBox3.setFromArray(instancedGeometry.attributes.position.array)

    //             mesh.geometry.dispose()
    //             mesh.geometry = instancedGeometry
    //             // mesh.geometry.boundingBox = tmpBox3
    //             // mesh.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)

    //             mesh.material.uniforms.diffuse = { value: new Color(element.featureNetwork["color"]) }
    //             // mesh.material.color = new Color(element.featureNetwork["color"])

    //             mesh.updateMatrix()


    //             pointTile.updateMatrixWorld();


    //             // console.log(mesh.geometry.attributes)

    //         }

    //     }

    //     this.instance.notifyChange(this.camera)


    // }


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

        material.onBeforeCompile = (shader) => {


            shader.vertexShader = shader.vertexShader.replace('#include <batching_pars_vertex>', `
                #include <batching_pars_vertex>
                attribute int aFeatureUid;

                varying float vFeatureUid;
            `)

            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vFeatureUid = float(aFeatureUid);
            `)

            shader.fragmentShader = shader.fragmentShader.replace('uniform vec3 diffuse;', `
                uniform vec3 diffuse;
                uniform float uFeatureUidSelected;
                
                varying float vFeatureUid;
            `)

            shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
                #include <dithering_fragment>
                
                if (uFeatureUidSelected == vFeatureUid){
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `)

        }

        return material
    }
}
