import { AddEquation, AdditiveBlending, AlwaysDepth, AlwaysStencilFunc, Box3, BufferAttribute, BufferGeometry, Color, CustomBlending, DataArrayTexture, DirectionalLight, DoubleSide, Fog, GLSL3, GreaterDepth, Group, InstancedBufferGeometry, LessDepth, Material, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshStandardMaterial, NormalBufferAttributes, Object3D, OneFactor, PerspectiveCamera, ReplaceStencilOp, ShaderLib, ShaderMaterial, Sphere, Texture, TypedArray, UniformsLib, UniformsUtils, Vector2, Vector3, ZeroFactor } from "three";
import { concatMap, delay, filter, retryWhen, map as rxjsMap, take, tap } from "rxjs/operators"
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls } from "../giro-3d-module";
import { Feature, GeometryLayout, MVT, Polygon, TileState, VectorTileSource, GeoJSON, FeatureLike, getCenter } from "../ol-module";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper, getAllFeaturesInVectorTileSource, getFeaturesFromTileCoord } from "../../helper/carto.helper";
import { Projection } from "ol/proj";
import { BehaviorSubject, of, ReplaySubject } from "rxjs";
import { TileCoord } from "ol/tilecoord";
import { BufferGeometryUtils, VertexNormalsHelper } from "three/examples/jsm/Addons";
import Earcut from 'earcut';
import Flatbush from 'flatbush';
import { FillStyle, StrokeStyle } from "@giro3d/giro3d/core/FeatureTypes";

import { FeaturesStoreService } from "../data/store/features.store.service";
import { AppInjector } from "../../helper/app-injector.helper";
import { environment } from "../../environments/environment";
import { PolygonOptions } from "./building/type";
import { Builder, createBuildingPolygons } from "./building/builder";
import { polygon as turf_polygon, featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { LEVEL_HEIGHT } from "./building/building-params";
import VectorRenderTile from "ol/VectorRenderTile";
import { Extent, getBottomLeft, getBottomRight, getTopLeft } from "ol/extent";
import { BuildingsTile } from "./building/helper";
import { build3dBuildings } from "./build3dBuilding";


/**
 * Level in meters
 * See https://wiki.openstreetmap.org/wiki/Key:building:levels
 */
// export const LEVEL_HEIGHT = 3

/**
 * THE width/height of a building tile 30 KM
 */
const BUILDING_TILE_SIZE = 500

const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()

export class BuildingLayer {
    instance: Instance
    map: Giro3DMap
    controls: OrbitControls
    tileLoad$ = new ReplaySubject()
    buildingMaterial: ShaderMaterial
    buildingGroup: Group = new Group()
    _tileSets: Map<string, BuildingsTile> = new Map()

    buildingsHeights$: BehaviorSubject<Map<number, number>>
    buildingsIndex$: BehaviorSubject<Flatbush>;
    buildingTexture: DataArrayTexture
    noiseTexture: Texture

    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);
    worker: Worker

    constructor(
        map: Giro3DMap,
    ) {

        this.buildingsHeights$ = this.featuresStoreService.buildingsHeights$
        this.buildingsIndex$ = this.featuresStoreService.buildingsIndex$

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.buildingGroup.matrixAutoUpdate = false
        this.instance.add(this.buildingGroup)

        this.buildingGroup.renderOrder = 3


        this.buildingMaterial = new ShaderMaterial({
            // depthTest: false,
            // depthWrite: false,
            // wireframe: true,
            // transparent: true,
            glslVersion: GLSL3,
            side: DoubleSide,
            fog: true,
            // alphaTest: 999,
            // blendEquation: AddEquation,
            // blendSrc: OneFactor,
            // blendDst: ZeroFactor,
            // blending: CustomBlending,
            // blending: AdditiveBlending,


            // blendAlpha: CustomBlending,
            // blendSrcAlpha: OneFactor,
            // blendDstAlpha: ZeroFactor,
            // blendEquationAlpha: AddEquation,

            // depthFunc: LessDepth,
            // lights: true,
            // depthFunc: GreaterDepth,
            vertexShader: `
                #define USE_FOG
                #include <fog_pars_vertex>
                
                uniform float fogNear;
                uniform float fogFar;
        
                precision highp float;
                precision highp int;
                precision highp sampler2D;
                precision highp usampler2D;
                precision highp sampler2DArray;
                precision highp sampler3D;
        
                    attribute vec3 color;
                    attribute float textureId;
        
                    out vec3 vColor;
                    out vec2 vUv;
                    out vec3 vNormal;
                    out vec3 vNewPosition;
                    out vec3 vPosition;
                    out vec4 mvPosition;
        
        
                    flat out int vTextureId;
                
                // uniform sampler2DArray tMap;
        
                void main(){
        
        
                    vColor = color;
                    vUv = uv;
                    vTextureId = int(textureId);
        
                    
                    vNormal = vec3(modelViewMatrix * vec4(normal, 0));
                    vPosition = vec3( position );
                    mvPosition = modelViewMatrix * vec4(position, 1.);
                    vNewPosition = vec3(mvPosition);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    // #include <fog_vertex>
                    // float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
                    // if (fogFactor > 0.9){
                    //         gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                    // }
                    // vec2 windowUV = vec2(
                    //     floor((vUv.x + (floor(vUv.y) * 3.)) * 0.25),
                    //     vUv.y
                    // );
        
                    // if(windowUV.x <= 1.0 || windowUV.y <= 1.0){ 
                    //     float displacement = texture(tMap, vec3(uv, vTextureId * 4 + 1)).r;
                    //     vec3 newPosition = position + normal * displacement * 10.0; 
                    //     gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                    // }else{
                    //     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    // }
        
                   
                
                }
            `,
            fragmentShader: `
                #define USE_FOG
                #include <fog_pars_fragment>
        
                precision highp float;
                precision highp int;
                precision highp sampler2D;
                precision highp usampler2D;
                precision highp sampler2DArray;
                precision highp sampler3D;
        
                vec3 WINDOW_GLOW_COLOR  = vec3(1, 0.9, 0.7);
                float windowLightThreshold = 0.0;  
        
                in vec3 vColor;
                in vec2 vUv;
                in vec3 vNormal;
                in vec3 vNewPosition;
                in vec3 vPosition;
                in vec4 mvPosition;
        
        
                flat in int vTextureId;
        
        
                uniform sampler2DArray tMap;
                uniform sampler2D tNoise;
                uniform vec3 diffuse;
                uniform vec3 emissive;
                uniform float roughness;
                uniform float metalness;
                uniform float opacity;
        
                
                out vec4 fragColor;
                // vec4 fragColor;
        
                // layout(location = 0) out vec4 outColor;
                // layout(location = 1) out vec3 outNormal;
                // layout(location = 5) out vec3 outGlow;
        
        
                vec3 packNormal(vec3 normal) {
                    return normal;
                }
        
                vec3 getMotionVector(vec4 clipPos, vec4 prevClipPos) {
                    return 0.5 * vec3(clipPos / clipPos.w - prevClipPos / prevClipPos.w);
                }
        
                // mat3 getTBN(vec3 N, vec3 p, vec2 uv) {
                //     /* get edge vectors of the pixel triangle */
                //     vec3 dp1 = dFdx(p);
                //     vec3 dp2 = dFdy(p);
                //     vec2 duv1 = dFdx(uv);
                //     vec2 duv2 = dFdy(uv);
        
                //     /* solve the linear system */
                //     vec3 dp2perp = cross(dp2, N);
                //     vec3 dp1perp = cross(N, dp1);
                //     vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
                //     vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
        
                //     /* construct a scale-invariant frame */
                //     float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
                //     return mat3(T * invmax, -B * invmax, N);
                // }
        
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
        
                
                vec4 getColorValue(int textureId, float mask, vec3 tintColor) {
                    vec3 color = mix(vec3(1), tintColor, mask);
                    return texture(tMap, vec3(vUv, textureId * 4)) * vec4(color, 1.0);
                }
        
        
                vec3 getMaskValue(int textureId) {
                    return texture(tMap, vec3(vUv, textureId * 4 + 2)).xyz;
                }
        
                vec3 getGlowColor(int textureId) {
                    return texture(tMap, vec3(vUv, textureId * 4 + 3)).xyz;
                }
        
                vec3 getNormalValue(int textureId) {
                    mat3 tbn = getTBN(vNormal, vNewPosition, vec2(vUv.x, 1. - vUv.y));
                    vec3 mapValue = texture(tMap, vec3(vUv, textureId * 4 + 1)).xyz * 2. - 1.;
                    vec3 normal = normalize(tbn * mapValue);
        
                    normal *= float(gl_FrontFacing) * 2. - 1.;
        
                    return normal;
                }
        
                void main(){
                    
                    vec3 mask = getMaskValue(vTextureId);
                    float noiseTextureWidth = vec2(textureSize(tNoise, 0)).r;
        
                    vec2 windowUV = vec2(
                        floor((vUv.x + (floor(vUv.y) * 3.)) * 0.25),
                        vUv.y
                    ); 
                    vec4 outColor = vec4(1.0);
                    // outColor = vec4(windowUV.x,0.0,0.0,1.0);
        
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0)); 
                    vec3 normalMap = packNormal(getNormalValue(vTextureId));
                    float diff = max(dot(normalMap, lightDir), 0.8);
        
                    if(windowUV.x <= 1.0 || windowUV.y <= 1.0){
                        
                    // is the roof
                    // 0 -> color
                    // 1 -> Normal
                    // 2 -> ARM
                    // outColor = vec4(1.0,0.0,0.0,1.0);
                    
                        
                        // outColor =  getColorValue(vTextureId, mask.b, vColor);
        
                        if (vTextureId != 2){
                            // our default texture for the roof
                            outColor =   getColorValue(vTextureId, mask.b, vColor);
        
                            // calculate the final color based on the PBR model
                            vec3 albedo = outColor.rgb * (1.0 - mask.r) + mask.r * outColor.rgb; // simple albedo calculation
                            float specularFactor = 1.0 - mask.g;
                            vec3 diffuseColor = albedo;
                            // calculate the final color with some basic lighting effects (e.g., ambient occlusion)
                            float aoFactor = 1.0 - abs(dot(normalMap, lightDir));
                            diffuseColor *= (aoFactor + specularFactor) * 0.5;
        
        
                            fragColor = vec4(diffuseColor, outColor.a);
                        }
                        else{
                        
                            // vec4 color = texture(tMap, vec3(vUv, vTextureId * 4));
                            // vec4 ormData = texture(tMap, vec3(vUv, vTextureId * 4 + 2));
        
                            // float ao = ormData.r;       // Ambient Occlusion from the R channel
                            // float roughness = ormData.g; // Roughness from the G channel
                            // float metalness = ormData.b; // Metalness from the B channel
        
                            // Sample the normal map texture and adjust the normal vector
                            // vec3 normalTex =texture(tMap, vec3(vUv, vTextureId * 4 + 1)).rgb;
                            // vec3 perturbedNormal = normalize(vNormal + (normalTex * 2.0 - 1.0));
        
                            // Shading logic (basic Phong-style shading for the example)
                            // float diff = max(dot(perturbedNormal, lightDir), 0.0);
        
                            // Apply ambient occlusion, roughness, and metalness in shading
                            // vec3 ambient = ao * color.rgb * 1.3; // AO affects ambient lighting
                            // vec3 diffuse = color.rgb * diff * (1.0 - roughness);
                            // vec3 specular = mix(vec3(0.4), color.rgb, metalness) * pow(diff, 16.0); // Adjust specular with metalness
        
                            // Final color output
                            // vec3 finalColor = ambient + diffuse + specular;
                            // // outColor = vec4(color.rgb, 1.0);
                            
                            outColor =  diff * getColorValue(vTextureId, mask.b, vColor);
                            fragColor = outColor;
                            // fragColor = vec4(1.0, 0.0,0.0, 1.0);
                        }
                        
                    }
                    
                  
                    else if (mask.b == 0.0 && mask.g > 0.9){
                        // is the glass of the window here
                        // > 0.9 to prevent to render the small white stroke around the window
                        vec4 baseColor =  getColorValue(vTextureId, mask.b, vColor);
                        vec3 outGlow = getGlowColor(vTextureId) * WINDOW_GLOW_COLOR * 1.4;
        
                        outColor =   vec4(baseColor.xyz+outGlow,baseColor.a);
        
                        // calculate the final color based on the PBR model
                        vec3 albedo = outColor.rgb * (1.0 - mask.r) + mask.r * outColor.rgb; // simple albedo calculation
                        float specularFactor = 1.0 - mask.g;
                        vec3 diffuseColor = albedo;
        
                        // calculate the final color with some basic lighting effects (e.g., ambient occlusion)
                        float aoFactor = 1.0 - abs(dot(normalMap, lightDir));
                        diffuseColor *= (aoFactor + specularFactor) * 0.8;
                        fragColor = vec4(diffuseColor, outColor.a);
                        // outColor = diff * getColorValue(vTextureId, mask.b, vColor);
                        // fragColor = outColor;
        
                    }else{
                        // Wall
                        // outColor =  vec4(0.0, 0.0, 0.0, 0.8);
                        outColor =  getColorValue(vTextureId, mask.b, vColor);
        
                       // calculate the final color based on the PBR model
                        vec3 albedo = outColor.rgb * (1.0 - mask.r) + mask.r * outColor.rgb; // simple albedo calculation
                        float specularFactor = 1.0 - mask.g;
                        vec3 diffuseColor = albedo;
        
                        // calculate the final color with some basic lighting effects (e.g., ambient occlusion)
                        float aoFactor = 1.0 - abs(dot(normalMap, lightDir));
                        diffuseColor *= (aoFactor + specularFactor) * 0.5;
        
                        fragColor = vec4(diffuseColor, outColor.a);
                    }
                    #ifdef USE_FOG
                        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
                        // if (fogFactor > 0.4){
                        //     discard;
                        // }
                        fragColor.rgb = mix( fragColor.rgb, fogColor, fogFactor );
                    #endif
                    // gl_FragColor = fragColor;
                    
                    // vec4 metalnessCol = vec4(1.0, 0.0, 0.0,  mask.g);
                    // vec4 roughnessCol = vec4(mask.r, 0.0, 0.0, 1.0);
                    // outColor *= metalnessCol;
                    // outColor *= roughnessCol;
                    // vec4 finalCol = vec4(outColor.rgb * mask.g, outColor.a);
                    // fragColor = finalCol;
        
                    // outColor *= (1.0 - mask.r);
                    // vec3 metalColor = mix( outColor.rgb, vec3(0.03), mask.g);
                    // fragColor =  vec4(metalColor,outColor.a );
        
                }
            `,
            uniforms: {
                ...UniformsUtils.merge([
                    UniformsLib['common'],
                    UniformsLib['fog'],
                    {
                        diffuse: { value: new Color(0x00ff00) },
                        opacity: { value: 1.0 },
                    },
                ])
                // fogColor: { value: (this.instance.scene.fog as Fog).color },
                // fogNear: { value: (this.instance.scene.fog as Fog).near },
                // fogFar: { value: (this.instance.scene.fog as Fog).far }
            }
        }
        );








        // this.buildingMaterial = new MeshBasicMaterial(
        //     {
        //         // color: "yellow",
        //         // depthWrite: false,
        //         // depthTest: false,
        //         // depthFunc: LessDepth,
        //         side: DoubleSide,
        // })




        // this.buildingMaterial.onBeforeCompile = (shader) => {
        //     // console.log(shader)
        //     shader.vertexShader = shader.vertexShader.replace('#include <batching_pars_vertex>', `
        //       #include <batching_pars_vertex>

        //       attribute vec3 AisPositionRoofOrFloor;
        //       varying vec3 VisPositionRoofOrFloor;

        //     `)
        //     shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        //         #include <begin_vertex>


        //         // if (AisPositionRoofOrFloor.x == 0.0){
        //         //   transformed.z +=100.0;
        //         // }

        //         VisPositionRoofOrFloor = AisPositionRoofOrFloor;

        //       `)

        //     shader.fragmentShader = shader.fragmentShader.replace('uniform vec3 diffuse;', `
        //         uniform vec3 diffuse;
        //         varying vec3 VisPositionRoofOrFloor;
        //       `)

        //     shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
        //         #include <dithering_fragment>

        //         if (VisPositionRoofOrFloor.x == 0.0){
        //           discard;
        //         }else if (VisPositionRoofOrFloor.x == 1.0){
        //           gl_FragColor = vec4(1, 1.0, 1.0, 1);

        //         }else {
        //             gl_FragColor = vec4(0.46, 0.47, 0.45, 1.0);
        //         }


        //       `)
        // }


    }

    setBuildingTexture(buildingTexture: DataArrayTexture, noiseTexture: Texture) {
        if (this.buildingTexture) {
            return
        }
        this.buildingTexture = buildingTexture
        this.noiseTexture = noiseTexture
    }

    getBuildingsTile(coordinate: Vector2) {

        // const tilePosition = new Vector2(
        //     Math.ceil(coordinate.x - BUILDING_TILE_SIZE),
        //     Math.ceil(coordinate.y - BUILDING_TILE_SIZE)
        // )


        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        if (this._tileSets.has(tile_key)) {
            return this._tileSets.get(tile_key)
        }

        const newBuildingTile = new BuildingsTile()
        newBuildingTile.key = tile_key
        newBuildingTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )
        // console.log(newBuildingTile.position)
        newBuildingTile.updateMatrixWorld()
        newBuildingTile.updateMatrix()

        this.buildingGroup.add(newBuildingTile)

        this._tileSets.set(tile_key, newBuildingTile)
        return newBuildingTile
    }

    currentZoomChanged(zoom: number) {
        if (zoom < 16) {
            this.buildingGroup.visible = false
        } else {
            this.buildingGroup.visible = true
        }
    }

    // addBuildingMap() {
    //     // let 
    //     // this.buildingGroup.renderOrder = 3

    //     fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
    //         rxjsMap((instanceCamera) => {
    //             const camera = instanceCamera.view.camera as PerspectiveCamera
    //             const focalLength = camera.position.distanceTo(this.controls.target);
    //             const fov = camera.fov * (Math.PI / 180);
    //             const aspect = camera.aspect;

    //             const heightNear = 2 * Math.tan(fov / 2) * focalLength;
    //             const mapWith = heightNear * aspect;

    //             const tileGrid = createXYZ({ tileSize: 512 })
    //             let target_resolution = mapWith / this.map["_instance"].domElement.width

    //             // Compute Z of the map
    //             const z = tileGrid.getZForResolution(
    //                 target_resolution
    //             );
    //             // console.log(z)
    //             if (z < 16) {
    //                 this.buildingGroup.visible = false
    //             }
    //             // this.instance.camera.minNearPlane = 0.1
    //             // if (camera.near == 0.1) {
    //             //     this.instance.camera.far = 50
    //             //     this.instance.camera.update()
    //             //     //     //     this.instance.camera.minNearPlane = 1
    //             //     //     //     this.instance.view.camera.near = 1
    //             //     //     //     this.instance.view.camera.updateProjectionMatrix();
    //             //     //     //     // camera.near = 1
    //             //     //     //     // camera.updateProjectionMatrix();
    //             //     //     this.instance.camera.resetPlanes()
    //             // }
    //             // console.log(camera.far, this.instance.camera.near)
    //             return [z, mapWith]
    //         }),
    //         filter((zAndMapWith) => zAndMapWith[0] >= 16),
    //         // debounceTime(200),
    //         rxjsMap((zAndMapWith) => {
    //             const mapExtent = CartoHelper.getMapExtent(this.map)

    //             if (mapExtent == undefined) {
    //                 throw "Could not compute the map extent";
    //             }


    //             this.buildingGroup.visible = true
    //             // this.buildingGroup.origin = mapExtent.centerAsVector3()
    //             // this.buildingGroup.position.set(this.buildingGroup.origin.x, this.buildingGroup.origin.y, this.buildingGroup.origin.z)
    //             // this.buildingGroup.boundingBox = new Box3(
    //             //     new Vector3(mapExtent.west(), mapExtent.south(), -1),
    //             //     new Vector3(mapExtent.east(), mapExtent.north(), 1),
    //             // );
    //             // this.buildingGroup.updateMatrixWorld()
    //             // this.buildingGroup.updateMatrix()
    //             // const bottomLeftExtent = mapExtent.bottomLeft().toVector3().project(this.camera)
    //             // const topRightExtent = mapExtent.topRight().toVector3().project(this.camera);
    //             // console.log(mapExtent, [
    //             //   topRightExtent.x - bottomLeftExtent.x,
    //             //   topRightExtent.y - bottomLeftExtent.y,
    //             // ])
    //             // const extentDimension = new Vector2()
    //             // mapExtent.dimensions(extentDimension)

    //             const olExtent = OLUtils.toOLExtent(mapExtent);
    //             const targetProjection = new Projection({ code: "EPSG:3857" });
    //             let mapWith = zAndMapWith[1]

    //             let target_resolution = mapWith / this.map["_instance"].domElement.width


    //             const tilesToLoad = []

    //             this.vectorTileSource.tileGrid.forEachTileCoord(olExtent, 16, (tileCoord: TileCoord) => {
    //                 const z = tileCoord[0]
    //                 const x = tileCoord[1]
    //                 const y = tileCoord[2]

    //                 // let giroTile
    //                 // this.object3d.traverse((object: any) => {
    //                 //     // && object.userData.x == x && object.userData.y==y 
    //                 //     if (object.isFeatureTile && object.visible && object.userData.z == 14 && mapExtent.intersect(object.userData.extent)) {
    //                 //         // console.log(object)
    //                 //         giroTile = object
    //                 //     }
    //                 //     if (giroTile) {
    //                 //         return
    //                 //     }
    //                 //     // break
    //                 // })
    //                 // if (!this.buildingGroup.parent) {
    //                 //     console.log(giroTile)
    //                 //     giroTile.add(this.buildingGroup)
    //                 // }

    //                 const currentTile = this.vectorTileSource.getTile(z, x, y, target_resolution, targetProjection)
    //                 // console.log(currentTile.getState(), "loading tile ")
    //                 if (currentTile.getState() == TileState.IDLE) {
    //                     currentTile.getSourceTiles()
    //                     tilesToLoad.push(currentTile.getKey())
    //                 }
    //             })
    //             if (tilesToLoad.length > 0) {
    //                 this.tileLoad$.pipe(
    //                     take(tilesToLoad.length),
    //                     filter((val, index) => index == tilesToLoad.length - 1),
    //                     tap(() => {
    //                         this.extentLoadEnd()
    //                     })
    //                 ).subscribe()
    //             }

    //         }),
    //         retryWhen((errors) => {
    //             return errors.pipe(
    //                 tap(val => console.warn(val)),
    //                 delay(300),
    //                 // take(1)
    //             )
    //         }),
    //     ).subscribe()

    //     this.vectorTileSource.on("tileloaderror", () => {
    //         this.tileLoad$.next(undefined)
    //     })

    //     this.vectorTileSource.on("tileloadend", (event: any) => {
    //         // console.log(
    //         //     (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "point" && feat.getProperties()["type"] == "tree")
    //         // )
    //         let features = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings")
    //         this.tileLoad$.next(undefined)
    //         if (features.length > 0) {

    //             this.processFeatures(features)
    //         }
    //     })

    // }

    extentLoadEnd(vectorTileSource: VectorTileSource, tilesToLoad: VectorRenderTile[], parentTile: TileCoord) {

        for (let index = 0; index < tilesToLoad.length; index++) {
            const tile = tilesToLoad[index];
            const features = getFeaturesFromTileCoord(tile, 16).filter((feat) => feat.getProperties()["layer"] == "buildings" && ["bench", "construction", "streetLamp", "busStop"].indexOf(feat.getProperties()["type"]) == -1)

            if (features.length > 0) {
                const buildingTileCenter = getBottomLeft(vectorTileSource.tileGrid.getTileCoordExtent(tile.getTileCoord()))
                const x = buildingTileCenter[0]
                const y = buildingTileCenter[1]



                const buildingTile = this.getBuildingsTile(new Vector2(x, y))
                const worldBuildingPosition = buildingTile.getWorldPosition(new Vector3())
                const serializableFeatures = features.map((feature) => {
                    return {
                        // @ts-expect-error
                        "flatCoordinates": feature.getFlatCoordinates(),
                        // @ts-expect-error
                        "ends_": feature.ends_,
                        "properties": feature.getProperties()
                    }
                })
                if (tile.getTileCoord()[1] == 33191 && tile.getTileCoord()[2] == 22540) {
                    console.log(x, y, serializableFeatures[0].flatCoordinates)
                }
                // console.log(buildingTile.position, "position")
                if (window.Worker && typeof Worker !== 'undefined') {
                    // Create a new
                    if (this.worker == undefined) {
                        this.worker = new Worker(new URL('../processing.worker', import.meta.url));
                    }

                    this.worker.onmessage = ({ data }) => {
                        let tile = this._tileSets.get(data.tile_key)
                        this.loadFeatureInScene(
                            data.geometriesJson,
                            tile
                        )
                    };

                    this.worker.postMessage({ "features": serializableFeatures, "worldBuildingPosition": worldBuildingPosition, "tile_key": buildingTile.key });

                } else {
                    let data = build3dBuildings(serializableFeatures, worldBuildingPosition, buildingTile.key)
                    let tile = this._tileSets.get(data.tile_key)
                    this.loadFeatureInScene(
                        // @ts-expect-error
                        data.geometriesJson,
                        tile
                    )
                }
                // this.processFeatures(features, buildingTile)
            }
        }


        const buildingFeatures = getAllFeaturesInVectorTileSource(vectorTileSource).filter((feat) => feat.getProperties()["layer"] == "buildings")
        if (buildingFeatures.length > 0) {

            const buildingsHeights = new Map()
            const index = new Flatbush(buildingFeatures.length);

            buildingFeatures.map((feature) => {
                const properties = feature.getProperties()
                const featureExtent = new Polygon(feature.getFlatCoordinates(), 'XY', feature.ends_).getExtent()

                const rectangleIndexPosition = index.add(
                    featureExtent[0],
                    featureExtent[1],
                    featureExtent[2],
                    featureExtent[3],
                )
                buildingsHeights.set(rectangleIndexPosition, this.getBuildingParameters(properties)["height"] * 1.3)
            })
            index.finish()
            this.buildingsHeights$.next(buildingsHeights)
            this.buildingsIndex$.next(index)
        }

    }

    loadFeatureInScene(geometriesJson: {
        key: string;
        data: {
            itemSize: number;
            type: string;
            array: number[];
            normalized: boolean;
        }
    }[], buildingTile: BuildingsTile) {

        const geometry = new BufferGeometry()
        geometriesJson.map((geometryJson) => {
            geometry.setAttribute(geometryJson.key, new BufferAttribute(new Float32Array(geometryJson.data.array), geometryJson.data.itemSize, geometryJson.data.normalized))
        })

        // const geometry = BufferGeometryUtils.mergeGeometries(buildingGeometries)
        const building = new Mesh(geometry, this.buildingMaterial)
        tmpBox3.setFromArray(building.geometry.attributes.position.array)
        building.geometry.boundingBox = tmpBox3
        building.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)
        building.frustumCulled = true
        building.updateMatrix()

        buildingTile.add(building)
        buildingTile.updateMatrixWorld()



        if (this.buildingMaterial.uniforms.tNoise == undefined) {
            this.buildingMaterial.uniforms.tMap = {
                value: this.buildingTexture
            }
            this.buildingMaterial.uniforms.tNoise = {
                value: this.noiseTexture
            }
        }
        this.instance.notifyChange(buildingTile)
        // this.instance.notifyChange(this.instance.view.camera, {
        //     immediate: false,
        //     needsRedraw: true
        // })
    }

    processFeatures(features: FeatureLike[], buildingTile: BuildingsTile) {


        // const turfFeatures = features.map((feature) => {
        //     const flatCoordinates: Array<number> = feature.getFlatCoordinates()
        //     const polygon_ = new Polygon(flatCoordinates, GeometryLayout.XY, feature.ends_)
        //     return turf_polygon(polygon_.getCoordinates(), feature.getProperties())
        // })
        // const featureExtent = bbox(featureCollection(turfFeatures))

        // const buildingTile = this.getBuildingsTile(
        //     tempVec2.set(featureExtent[2], featureExtent[3])
        // )

        const olFeatures: Array<Feature<Polygon>> = features.map((feature) => {
            // @ts-expect-error
            const flatCoordinates: Array<number> = feature.getFlatCoordinates()

            // buildingTile.updateWorldMatrix()
            const worldBuildingPosition = buildingTile.getWorldPosition(new Vector3())
            const newFlatCoordinates = flatCoordinates.slice().map((coord, index) => {
                // pair => x
                if (index % 2 == 0) {
                    return coord - worldBuildingPosition.x
                }
                return coord - worldBuildingPosition.y
            })
            // console.log(newFlatCoordinates)

            function signedArea(coordinates) {
                let area = 0;
                const len = coordinates.length;
                for (let i = 0; i < len; i++) {
                    const [x1, y1] = coordinates[i];
                    const [x2, y2] = coordinates[(i + 1) % len];
                    area += (x2 - x1) * (y2 + y1);
                }
                return area;
            }

            function ensureClockwise(coordinates) {
                if (signedArea(coordinates) > 0) {
                    // If the polygon is counterclockwise, reverse the coordinates
                    return coordinates.reverse();
                }
                return coordinates; // Already clockwise
            }
            function ensureCounterClockwise(coordinates) {
                if (signedArea(coordinates) > 0) {
                    // If the polygon is clockwise, reverse the coordinates
                    return coordinates;
                }
                return coordinates.reverse();
            }


            // @ts-expect-error
            const polygon = new Polygon(newFlatCoordinates, GeometryLayout.XY, feature.ends_)
            // console.log(newFlatCoordinates, flatCoordinates)
            const newOuterAndInnerCoordinates = polygon.getLinearRings().map((ring, index) => {
                let outerRing = ring.getCoordinates();
                if (index == 0) {
                    outerRing = ensureClockwise(outerRing);
                } else {
                    outerRing = ensureCounterClockwise(outerRing);
                }
                return outerRing
            })
            polygon.setCoordinates(newOuterAndInnerCoordinates)
            const olFeature = new Feature(polygon)
            olFeature.setProperties(feature.getProperties())
            return olFeature
        })

        // for (let index = 0; index < features.length; index++) {
        //     const feature = features[index];

        //     const flatCoordinates: Array<number> = feature.getFlatCoordinates()

        //     const newFlatCoordinates = flatCoordinates.map((coord, index) => {
        //         // pair => x
        //         if (index % 2 == 0) {
        //             return coord - buildingTile.position.x
        //         }
        //         return coord - buildingTile.position.y
        //     })


        //     const polygon = new Polygon(newFlatCoordinates, GeometryLayout.XY, feature.ends_)

        //     const street_gl_feature = new Feature(polygon)
        //     street_gl_feature.setProperties(feature.getProperties())
        //     street_gl_features.push(street_gl_feature)


        // const properties = feature.getProperties();

        // const buildingParameters = this.getBuildingParameters(properties)
        // const options: PolygonOptions = {
        //     extrusionOffset: buildingParameters["height"],
        //     ignoreZ: true,
        //     elevation: 0,
        //     // elevation: buildingParameters["minHeight"] <= 0 ? 1 : buildingParameters["minHeight"],
        //     origin: new Vec3(0, 0, -1)
        // }
        // // console.log(feature, polygon,)
        // const { positions, indices, isPositionRoofOrFloor } = createSurfaces(polygon, options);
        // // console.log(isPositionRoofOrFloor, positions, options.extrusionOffset)
        // const surfaceGeometry = new BufferGeometry();
        // // surfaceGeometry.name = 

        // surfaceGeometry.setAttribute('position', new BufferAttribute(positions, 3));
        // surfaceGeometry.setAttribute('AisPositionRoofOrFloor', new BufferAttribute(isPositionRoofOrFloor, 3));
        // surfaceGeometry.setIndex(new BufferAttribute(indices, 1));
        // surfaceGeometry.computeBoundingBox();
        // surfaceGeometry.computeBoundingSphere();
        // surfaceGeometry.computeVertexNormals();
        // // [buildingMaterial]
        // geometries.push(surfaceGeometry)

        // }

        if (olFeatures.length > 0) {


            const vectors_areas = createBuildingPolygons(olFeatures)

            const buildFeature = []
            for (let index = 0; index < vectors_areas.length; index++) {
                const element = vectors_areas[index];
                buildFeature.push(new Builder(element).getFeatures())
            }

            const buildingGeometries = buildFeature.map((building) => {

                const extrudedBuilding = building.extruded
                const buildingGeometry = new BufferGeometry();

                const colorBuffer = Float32Array.from(extrudedBuilding.colorBuffer)

                buildingGeometry.setAttribute("position", new BufferAttribute((extrudedBuilding.positionBuffer as Float32Array), 3))
                buildingGeometry.setAttribute("color", new BufferAttribute(colorBuffer.slice().map((v) => { return v / 255 }), 3))
                buildingGeometry.setAttribute("normal", new BufferAttribute((extrudedBuilding.normalBuffer as Float32Array), 3))
                buildingGeometry.setAttribute("textureId", new BufferAttribute((extrudedBuilding.textureIdBuffer as Int32Array), 1))
                buildingGeometry.setAttribute("uv", new BufferAttribute((extrudedBuilding.uvBuffer as Float32Array), 2))
                return buildingGeometry
            })


            const building = new Mesh(BufferGeometryUtils.mergeGeometries(buildingGeometries), this.buildingMaterial)

            tmpBox3.setFromArray(building.geometry.attributes.position.array)
            building.geometry.boundingBox = tmpBox3
            building.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)
            building.frustumCulled = true

            building.updateMatrix()
            buildingTile.add(building)
            buildingTile.updateMatrixWorld()
            // this.instance.notifyChange(buildingTile)
            // this.instance.notifyChange(buildingTile, {
            //     immediate: false,
            //     needsRedraw: true
            // })

            // const vertexNormalsHelper = new VertexNormalsHelper(building, 5, 0xff0000);
            // vertexNormalsHelper.updateMatrix()
            // this.instance.scene.add(vertexNormalsHelper)
            // buildingTile.add(vertexNormalsHelper)
            // buildingTile.updateMatrixWorld()



            if (this.buildingMaterial.uniforms.tNoise == undefined) {
                this.buildingMaterial.uniforms.tMap = {
                    value: this.buildingTexture
                }
                this.buildingMaterial.uniforms.tNoise = {
                    value: this.noiseTexture
                }
            }


            // this.buildingMaterial.onBeforeCompile = (shader) => {
            //     if (shader.uniforms.tMap == undefined) {
            //         shader.uniforms.tMap = {
            //             value: this.buildingTexture
            //         }
            //         shader.uniforms.tNoise = {
            //             value: this.noiseTexture
            //         }
            //     }

            // shader.vertexShader = shader.vertexShader.replace('#include <batching_pars_vertex>', `
            //   #include <batching_pars_vertex>

            //   attribute vec3 color;
            //   attribute float textureId;

            //     varying vec3 vColor;
            //     varying vec2 vUv;
            //     varying vec3 vNormal;
            //     flat out float vTextureId;

            // //   varying vec3 VisPositionRoofOrFloor;

            // `)
            // shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
            //     #include <begin_vertex>

            //     vColor = color;
            //     vUv = uv;
            //     vTextureId = textureId;
            //     vNormal = vec3(modelViewMatrix * vec4(normal, 0));

            //     // vec4 cameraSpacePosition = modelViewMatrix * vec4(position, 1.);
            //     // vNewPosition = vec3(cameraSpacePosition);

            //   `)

            // shader.fragmentShader = shader.fragmentShader.replace('uniform vec3 diffuse;', `
            //     uniform vec3 diffuse;
            //     varying vec3 vColor;
            //     varying vec2 vUv;
            //     // varying vec3 vNormal;
            //     varying vec3 vPosition;

            //     flat in float vTextureId;
            //     #define WINDOW_GLOW_COLOR vec3(1, 0.9, 0.7);

            //     uniform sampler2DArray tMap;
            //     uniform sampler2D tNoise;

            //     vec3 packNormal(vec3 normal) {
            //         return normal;
            //     }

            //     vec3 getMotionVector(vec4 clipPos, vec4 prevClipPos) {
            //         return 0.5 * vec3(clipPos / clipPos.w - prevClipPos / prevClipPos.w);
            //     }

            //     mat3 getTBN(vec3 N, vec3 p, vec2 uv) {
            //         /* get edge vectors of the pixel triangle */
            //         vec3 dp1 = dFdx(p);
            //         vec3 dp2 = dFdy(p);
            //         vec2 duv1 = dFdx(uv);
            //         vec2 duv2 = dFdy(uv);

            //         /* solve the linear system */
            //         vec3 dp2perp = cross(dp2, N);
            //         vec3 dp1perp = cross(N, dp1);
            //         vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
            //         vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

            //         /* construct a scale-invariant frame */
            //         float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
            //         return mat3(T * invmax, -B * invmax, N);
            //     }


            //     vec4 getColorValue(int textureId, float mask, vec3 tintColor) {
            //         vec3 color = mix(vec3(1), tintColor, mask);
            //         return texture(tMap, vec3(vUv, textureId * 4)) * vec4(color, 1);
            //     }

            //     vec3 getMaskValue(int textureId) {
            //         return texture(tMap, vec3(vUv, textureId * 4 + 2)).xyz;
            //     }

            //     // vec3 getGlowColor(int textureId) {
            //     //     return texture(tMap, vec3(vUv, textureId * 4 + 3)).xyz;
            //     // }

            //     // vec3 getNormalValue(int textureId) {
            //     //     mat3 tbn = getTBN(vNormal, vPosition, vec2(vUv.x, 1. - vUv.y));
            //     //     vec3 mapValue = texture(tMap, vec3(vUv, textureId * 4 + 1)).xyz * 2. - 1.;
            //     //     vec3 normal = normalize(tbn * mapValue);

            //     //     normal *= float(gl_FrontFacing) * 2. - 1.;

            //     //     return normal;
            //     // }

            //   `)

            // shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
            //     #include <dithering_fragment>

            // vec3 mask = getMaskValue(vTextureId);
            // // float noiseTextureWidth = vec2(textureSize(tNoise, 0)).r;

            //     gl_FragColor = vec4(0.46, 0.47, 0.45, 1.0);

            //     // if (VisPositionRoofOrFloor.x == 0.0){
            //     //   discard;
            //     // }else if (VisPositionRoofOrFloor.x == 1.0){
            //     //   gl_FragColor = vec4(1, 1.0, 1.0, 1);

            //     // }else {
            //     //     gl_FragColor = vec4(0.46, 0.47, 0.45, 1.0);
            //     // }


            //   `)
            // }

        }

    }

    getBuildingParameters(properties) {

        let minLevel = <number>properties.minLevel ?? null;
        let height = <number>properties.height ?? null;
        let levels = <number>properties.levels ?? null;
        let minHeight = <number>properties.minHeight ?? null;
        const roofLevels = properties.roofLevels <= 0 ? 0.6 : <number>properties.roofLevels ?? 0;
        let roofHeight = <number>properties.roofHeight ?? (roofLevels * LEVEL_HEIGHT);

        if (height !== null) {
            roofHeight = Math.min(roofHeight, height - (minHeight ?? 0));
        }

        if (height === null && levels === null) {
            levels = (minLevel !== null) ? minLevel : 1;
            height = levels * LEVEL_HEIGHT + roofHeight
        } else if (height === null) {
            height = levels * LEVEL_HEIGHT + roofHeight
        } else if (levels === null) {
            levels = Math.max(1, Math.round((height - roofHeight) / LEVEL_HEIGHT));
        }

        if (minLevel === null) {
            if (minHeight !== null) {
                minLevel = Math.min(levels - 1, Math.round(minHeight / LEVEL_HEIGHT));
            } else {
                minLevel = 0;
            }
        }

        if (minHeight === null) {
            minHeight = Math.min(minLevel * LEVEL_HEIGHT, height);
        }
        const isRoof = properties.buildingType === 'roof';
        let buildingMinHeight = isRoof ? (height - roofHeight) : minHeight

        // if (properties.height && !properties.minHeight && !properties.minLevel) {
        //     return properties.height
        // }else if (properties.height && properties.minHeight) {
        //     return Math.max(properties.height - properties.minHeight, LEVEL_HEIGHT)
        // }else if (properties.minHeight && !properties.height && properties.minLevel){
        //     return Math.max(properties.height - properties.minLevel*LEVEL_HEIGHT, LEVEL_HEIGHT)
        // }

        // if (properties.levels && !properties.minLevel)
        // if (properties.levels) {
        //     return properties.levels * 1.5
        // }
        return {
            height: height,
            minHeight: buildingMinHeight
        }
    }


}





const VERT_STRIDE = 3; // 3 elements per vertex position (X, Y, Z)
const X = 0;
const Y = 1;
const Z = 2;

/**
 * This methods prepares vertices for three.js with coordinates coming from openlayers.
 *
 * It does 2 things:
 *
 * - flatten the array while removing the last vertex of each rings
 * - builds the new hole indices taking into account vertex removals
 *
 * @param coordinates - The coordinate of the closed shape that form the roof.
 * @param stride - The stride in the coordinate array (2 for XY, 3 for XYZ)
 * @param offset - The offset to apply to vertex positions.
 * the first/last point
 * @param elevation - The elevation.
 */
export function createFloorVertices(
    coordinates: Array<Array<Array<number>>>,
    stride: number,
    offset: Vector3,
    elevation: Array<number> | number,
    ignoreZ: boolean,
) {
    // iterate on polygon and holes
    const holesIndices = [];
    let currentIndex = 0;
    const positions = [];
    for (const ring of coordinates) {
        // NOTE: rings coming from openlayers are auto-closing, so we need to remove the last vertex
        // of each ring here
        if (currentIndex > 0) {
            holesIndices.push(currentIndex);
        }
        for (let i = 0; i < ring.length - 1; i++) {
            currentIndex++;
            const coord = ring[i];
            positions.push(coord[X] - offset.x);
            positions.push(coord[Y] - offset.y);
            let z = 0;
            if (!ignoreZ) {
                if (stride === 3) {
                    z = coord[Z];
                } else if (elevation != null) {
                    z = Array.isArray(elevation) ? elevation[i] : elevation;
                }
            }
            z -= offset.z;
            positions.push(z);
        }
    }
    return { flatCoordinates: positions, holes: holesIndices };
}





/**
 * Create a roof, basically a copy of the floor with faces shifted by 'pointcount' elem
 *
 * NOTE: at the moment, this method must be executed before `createWallForRings`, because we copy
 * the indices array as it is.
 *
 * @param positions - a flat array of coordinates
 * @param pointCount - the number of points to read from position, starting with the first vertex
 * @param indices - the indices to duplicate for the roof
 * @param extrusionOffset - the extrusion offset(s) to apply to the roof element.
 */
// export function createRoof(
//     positions: Array<number>,
//     pointCount: number,
//     indices: Array<number>,
//     extrusionOffset: Array<number> | number,
// ) {
//     for (let i = 0; i < pointCount; i++) {
//         positions.push(positions[i * VERT_STRIDE + X]);
//         positions.push(positions[i * VERT_STRIDE + Y]);
//         const zOffset = Array.isArray(extrusionOffset) ? extrusionOffset[i] : extrusionOffset;
//         positions.push(positions[i * VERT_STRIDE + Z] + zOffset);
//     }
//     const iLength = indices.length;
//     for (let i = 0; i < iLength; i++) {
//         indices.push(indices[i] + pointCount);
//     }
// }

/**
* This methods creates vertex and faces for the walls
*
* @param positions - The array containing the positions of the vertices.
* @param start - vertex in positions to start with
* @param end - vertex in positions to end with
* @param indices - The index array.
* @param extrusionOffset - The extrusion distance.
*/
// function createWallForRings(
//     positions: Array<number>,
//     start: number,
//     end: number,
//     indices: Array<number>,
//     extrusionOffset: Array<number> | number,
// ) {
//     // Each side is formed by the A, B, C, D vertices, where A is the current coordinate,
//     // and B is the next coordinate (thus the segment AB is one side of the polygon).
//     // C and D are the same points but with a Z offset.
//     // Note that each side has its own vertices, as vertices of sides are not shared with
//     // other sides (i.e duplicated) in order to have faceted normals for each side.
//     let vertexOffset = 0;
//     const pointCount = positions.length / 3;

//     for (let i = start; i < end; i++) {
//         const idxA = i * VERT_STRIDE;
//         const iB = i + 1 === end ? start : i + 1;
//         const idxB = iB * VERT_STRIDE;

//         const Ax = positions[idxA + X];
//         const Ay = positions[idxA + Y];
//         const Az = positions[idxA + Z];

//         const Bx = positions[idxB + X];
//         const By = positions[idxB + Y];
//         const Bz = positions[idxB + Z];

//         const zOffsetA = Array.isArray(extrusionOffset) ? extrusionOffset[i] : extrusionOffset;
//         const zOffsetB = Array.isArray(extrusionOffset) ? extrusionOffset[iB] : extrusionOffset;

//         // +Z top
//         //      A                    B
//         // (Ax, Ay, zMax) ---- (Bx, By, zMax)
//         //      |                    |
//         //      |                    |
//         // (Ax, Ay, zMin) ---- (Bx, By, zMin)
//         //      C                    D
//         // -Z bottom

//         positions.push(Ax, Ay, Az); // A
//         positions.push(Bx, By, Bz); // B
//         positions.push(Ax, Ay, Az + zOffsetA); // C
//         positions.push(Bx, By, Bz + zOffsetB); // D

//         // The indices of the side are the following
//         // [A, B, C, C, B, D] to form the two triangles.

//         const A = 0;
//         const B = 1;
//         const C = 2;
//         const D = 3;

//         const idx = pointCount + vertexOffset;

//         indices.push(idx + A);
//         indices.push(idx + B);
//         indices.push(idx + C);

//         indices.push(idx + C);
//         indices.push(idx + B);
//         indices.push(idx + D);

//         vertexOffset += 4;
//     }
// }

// function createSurfaces(polygon: Polygon, options: PolygonOptions) {
//     const stride = polygon.getStride();

//     // First we compute the positions of the top vertices (that make the 'floor').
//     // note that in some dataset, it's the roof and user needs to extrusionOffset down.
//     const polyCoords = polygon.getCoordinates();

//     const { flatCoordinates, holes } = createFloorVertices(
//         polyCoords,
//         stride,
//         options.origin,
//         options.elevation,
//         options.ignoreZ,
//     );

//     const pointCount = flatCoordinates.length / 3;
//     const floorPositionsCount = flatCoordinates.slice().length
//     const triangles = Earcut(flatCoordinates, holes, 3);
//     // console.log(
//     //     [...flatCoordinates], holes, triangles, "----triangles--"
//     // )
//     // if (options.extrusionOffset != null) {
//     createRoof(flatCoordinates, pointCount, triangles, options.extrusionOffset);
//     const roofPositionsCount = floorPositionsCount + (flatCoordinates.slice().length - floorPositionsCount)

//     createWallForRings(
//         flatCoordinates,
//         0,
//         holes[0] || pointCount,
//         triangles,
//         options.extrusionOffset,
//     );

//     for (let i = 0; i < holes.length; i++) {
//         createWallForRings(
//             flatCoordinates,
//             holes[i],
//             holes[i + 1] || pointCount,
//             triangles,
//             options.extrusionOffset,
//         );
//     }
//     // }

//     const isVerticesRoofOrFloor = flatCoordinates.map((coordinate, index) => {
//         // is floor
//         if (index < floorPositionsCount) {
//             return 0.0
//         } else if (index < roofPositionsCount) {
//             // is roof
//             return 2.0
//         }
//         // is wall
//         return 1.0
//     })
//     const positions = new Float32Array(flatCoordinates);
//     const isPositionRoofOrFloor = new Float32Array(isVerticesRoofOrFloor);

//     const indices =
//         positions.length <= 65536 ? new Uint16Array(triangles) : new Uint32Array(triangles);

//     return { positions, indices, isPositionRoofOrFloor };
// }
