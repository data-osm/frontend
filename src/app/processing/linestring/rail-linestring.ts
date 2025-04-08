import { FlatLineStringLayer } from "./flat-linestring";
import { Coordinate } from "ol/coordinate";
import { AdditiveBlending, AlwaysDepth, Box3, DoubleSide, GLSL3, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LinearFilter, LinearMipmapLinearFilter, LineBasicMaterial, Mesh, MultiplyBlending, NearestFilter, NeverDepth, NormalBlending, Object3DEventMap, PerspectiveCamera, PlaneGeometry, RepeatWrapping, RGBAFormat, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, UnsignedByteType, Vector2, Vector3 } from "three";
import { Instance, Map as Giro3DMap, OrbitControls, OLUtils, tile } from "../../giro-3d-module";
import { DataOSMLayer } from "../../../helper/type";
import { combineLatest, from, last, map, tap } from "rxjs";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineSegments2 } from "three/examples/jsm/Addons";

const tmpVec2 = new Vector2()


export class RailLineString extends FlatLineStringLayer {

    loader: TextureLoader


    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {
        super(map, couche, min_z)
    }

    getTexture() {
        this.loader = new TextureLoader()
        const railTextures: {
            rail_diffuse: Texture,
            railway_diffuse: Texture,
            railway_normal: Texture,
            railway_top_diffuse: Texture,
            railway_mask: Texture
        } = {
            rail_diffuse: undefined,
            railway_diffuse: undefined,
            railway_normal: undefined,
            railway_top_diffuse: undefined,
            railway_mask: undefined,
        }
        const railTexturesPath = {
            rail_diffuse: "assets/textures/rails/rail_diffuse.png",
            railway_diffuse: "assets/textures/rails/railway_diffuse.png",
            railway_normal: "assets/textures/rails/railway_normal.png",
            railway_top_diffuse: "assets/textures/rails/railway_top_diffuse.png",
            railway_mask: "assets/textures/rails/railway_mask.png",
        }

        const loadTextures$ = Object.keys(railTexturesPath).map((key) => {
            return from(this.loader.loadAsync(railTexturesPath[key])).pipe(
                tap((texture) => {

                    texture.colorSpace = SRGBColorSpace;
                    texture.magFilter = LinearFilter
                    texture.minFilter = LinearMipmapLinearFilter;
                    texture.wrapS = RepeatWrapping;
                    texture.wrapT = RepeatWrapping;
                    texture.anisotropy = 16

                    railTextures[key] = texture
                })
            )
        })
        return combineLatest(loadTextures$).pipe(
            last(),
            map(() => {
                return railTextures
            })
        )
    }

    getLineMaterial() {
        return this.getTexture().pipe(
            map((railTextures) => {
                const material = new ShaderMaterial({
                    depthFunc: AlwaysDepth,
                    glslVersion: GLSL3,
                    vertexShader: `
                    
                    precision highp float;
                    precision highp int;
                    precision highp sampler2D;

                    out vec2 vUv;
                    out vec3 vNormal;
                    out vec3 vPosition;
                    
                    void main(){
                    
                        vUv= uv;

                        vec4 cameraSpacePosition = modelViewMatrix * vec4(position, 1.);
                        vPosition = vec3(cameraSpacePosition);
                        vNormal = vec3(modelViewMatrix * vec4(normal, 1.0));

                        // gl_PointSize = 500.0; // Set point size here (for WebGL1)
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    
                    }
                    `,
                    fragmentShader: `
                    
                    precision highp float;
                    precision highp int;
                    precision highp sampler2D;

                    uniform sampler2D UrailDiffuse;
                    uniform sampler2D UrailWayDiffuse;
                    uniform sampler2D UrailNormalDiffuse;
                    uniform sampler2D UraiToplDiffuse;
                    uniform sampler2D UraiMask;

                    uniform vec3 uCameraPosition;

                    out vec4 fragColor;
                    in vec2 vUv;
                    in vec3 vNormal;
                    in vec3 vPosition;


                    const mat4 screenDoorThresholdMatrix = mat4(
                        1.0 / 17.0,  9.0 / 17.0,  3.0 / 17.0,  11.0 / 17.0,
                        13.0 / 17.0, 5.0 / 17.0,  15.0 / 17.0, 7.0 / 17.0,
                        4.0 / 17.0,  12.0 / 17.0, 2.0 / 17.0,  10.0 / 17.0,
                        16.0 / 17.0, 8.0 / 17.0,  14.0 / 17.0, 6.0 / 17.0
                    );

                    float getScreenDoorFactor(float x, float y) {
                        return screenDoorThresholdMatrix[int(x) % 4][int(y) % 4];
                    }

                    mat3 getTBN(vec3 normal, vec3 position, vec2 uv) {
                        // Get edge vectors of the pixel triangle
                        vec3 dp1 = dFdx(position);  // Partial derivative of position with respect to x
                        vec3 dp2 = dFdy(position);  // Partial derivative of position with respect to y
                        vec2 duv1 = dFdx(uv);       // Partial derivative of UV with respect to x
                        vec2 duv2 = dFdy(uv);       // Partial derivative of UV with respect to y

                        // Solve the linear system to compute tangent and bitangent vectors
                        vec3 tangent = normalize(duv2.y * dp1 - duv1.y * dp2);  // Compute Tangent (T)
                        vec3 bitangent = normalize(duv2.x * dp1 - duv1.x * dp2); // Compute Bitangent (B)

                        // Ensure that the tangent, bitangent, and normal form a right-handed coordinate system
                        tangent = normalize(tangent) ;
                        bitangent = normalize(cross(normal, tangent));  // Use cross product to get a corrected bitangent

                        // Construct the TBN matrix with scale-invariance
                        return mat3(tangent, bitangent, -normal);  // TBN matrix with Z-up normal
                    }

                    vec3 getNormalValue(vec4 normalColor) {
                        mat3 tbn = getTBN(vNormal, vPosition, vec2(vUv.x, 1. - vUv.y));
                        
                        vec3 mapValue = normalColor.xyz * 2. - 1.;

                        vec3 normal = normalize(tbn * mapValue);

                        normal *= float(gl_FrontFacing) * 2. - 1.;

                        return normal;
                    }


                    
                    void main(){

                    vec4 textureColor = texture2D(UraiToplDiffuse, vUv);
                    vec4 normalColor = texture2D(UrailNormalDiffuse, vUv);
                    vec4 mask = texture2D(UraiMask, vUv);

                    if (textureColor.a - getScreenDoorFactor(gl_FragCoord.x, gl_FragCoord.y) < 0.0) {
                        // discard;
                    }

                    vec3 lightDir = normalize(vec3(1, 1, 1)); 
                    vec3 normalMap = getNormalValue(normalColor);

                    vec3 normal = normalize(vNormal + normalMap.rgb);

                    vec3 viewDir = normalize(uCameraPosition - vPosition);
                    float diffuse = max(dot(normal, lightDir), 0.6);

                    vec3 halfDir = normalize(lightDir + viewDir);
                    float specAngle = max(dot(normal, halfDir), 0.0);
                    float specular = pow(specAngle, (1.0 - mask.g) * 128.0);
                    vec3 reflectColor = mix(vec3(0.4), textureColor.rgb, mask.r);
                    vec3 finalColor = (textureColor.rgb * diffuse) + (reflectColor );


                    fragColor = vec4(finalColor, 1.0);

                    }

                    
                    `
                })

                // material.blending = NormalBlending
                material.uniforms = {
                    ...material.uniforms,
                    UrailDiffuse: { value: railTextures.rail_diffuse },
                    UrailWayDiffuse: { value: railTextures.railway_diffuse },
                    UrailNormalDiffuse: { value: railTextures.railway_normal },
                    UraiToplDiffuse: { value: railTextures.railway_top_diffuse },
                    UraiMask: { value: railTextures.railway_mask },
                    uCameraPosition: { value: this.camera.position }
                }
                return material
            })
        )
    }


}