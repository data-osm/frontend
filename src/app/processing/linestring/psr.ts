import { Coordinate } from "ol/coordinate";
import { AlwaysDepth, Box3, Color, CurveType, CylinderGeometry, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LineBasicMaterial, Material, Matrix4, Mesh, MeshStandardMaterial, NeverDepth, Object3DEventMap, PerspectiveCamera, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3, TubeGeometry, CatmullRomCurve3, DoubleSide, InstancedBufferGeometry, Float32BufferAttribute, BufferGeometry, Uint16BufferAttribute, BufferAttribute, Sphere, ShaderLib, UniformsUtils } from "three";


import { FeatureInTile, TubeLineStringLayer } from "./tube-linestring";
import { Feature } from "ol";
import { CartoHelper, CustomVectorSource, LinesStringWithZ, MultiLineStringWithZ } from "../../../helper/carto.helper";
import { getCenter } from "ol/extent";
import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";


interface FeatureInTileGroup {
    color: string
    zOffset: number
}

const NetWorkTye: {
    [key: string]: FeatureInTileGroup
} = {
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


export class PsrLayer extends TubeLineStringLayer<FeatureInTileGroup> {
    getFeatures(vectorSource: CustomVectorSource): Feature<LineString | MultiLineString>[] {
        return vectorSource.getFeatures() as Feature<LineString | MultiLineString>[]
    }
    getPointTileGroupByFromFeature(feature: Feature): string {
        const featureNetworkName: string = feature.getProperties()["Reseau"]

        return featureNetworkName
    }

    initializeLineFeatureInTile(feature) {
        const featureNetworkName: string = feature.getProperties()["Reseau"]
        const featureNetwork = NetWorkTye[featureNetworkName]
        return {
            features: [],
            instancePositions: [],
            group: featureNetwork,
        }
    }

    getFeatureRadius(feature) {
        const featureRadius: number = feature.getProperties()["Diametre"] ? feature.getProperties()["Diametre"] / 100 / 2 : 0.1
        return featureRadius
    }

    onGeometryCreated(geometry: TubeGeometry, feature: Feature) {
        const featureNotUsed: boolean = feature.getProperties()["Abandon"] === 0 ? false : true
        const uvAttribute = geometry.attributes.uv;

        // Create the visibility attribute
        const visibility = new Float32Array(uvAttribute.count);
        const dashLength = 0.1; // Fraction of the total length (e.g., 10% of the tube)
        const gapLength = 0.03; // Fraction of the total length (e.g., 3% of the tube)
        const totalLength = dashLength + gapLength;

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
        geometry.setAttribute('aPositionToHide', new BufferAttribute(visibility, 1));
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
