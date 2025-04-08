import { AbstractPointsLayer, AbstractPointsTile } from "./points";
import { Coordinate } from "ol/coordinate";
import { AdditiveBlending, AlwaysDepth, Box3, BufferAttribute, BufferGeometry, ClampToEdgeWrapping, DoubleSide, Fog, GLSL3, GreaterEqualDepth, Group, InstancedBufferAttribute, InstancedInterleavedBuffer, InterleavedBufferAttribute, LessDepth, Line, LinearFilter, LinearMipmapLinearFilter, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MultiplyBlending, NearestFilter, NeverDepth, NormalBlending, Object3DEventMap, PerspectiveCamera, PlaneGeometry, RepeatWrapping, ShaderMaterial, Sphere, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, WebGLProgramParametersWithUniforms } from "three";
import { Instance, Map as Giro3DMap, OrbitControls, OLUtils, tile } from "../giro-3d-module";
import { combineLatest, from, last, map, merge, take, tap } from "rxjs";
import { DataOSMLayer } from "../../helper/type";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { CustomInstancedBufferGeometry, PointMesh } from "./custom-mesh";
import { Feature, Geometry, Point } from "../ol-module";
import { getUid } from "ol";
import { mergeFloat32 } from "./utils";


export interface ModelRessource {
    path: string,
    scale: number,
    rotation: number,
    useGroups: boolean,
    translateZ?: number
}

type layerNameWithModel = "street_lamp" | "bus_stop" | "trafic_signals" | "stop_signals" | "give_way_signals" | "guidepost" | "subway_stop"
type LayerName = layerNameWithModel | "tram_stop"

class VerticalTrafficSignTile extends AbstractPointsTile {
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
            // this.meshes[key].frustumCulled = false
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
            // this.stickMeshes[key].frustumCulled = false
        }
    }

    afterCameraUpdate(camera: PerspectiveCamera) {
        for (const key in this.meshes) {
            try {
                if (this.meshes[key].material.uniforms.quaternion) {
                    this.meshes[key].material.uniforms.quaternion.value.copy(camera.quaternion).invert()
                }
            } catch (error) {

            }

        }
    }


    dispose() {
        for (const key in this.meshes) {
            if (this.meshes[key]) {
                this.meshes[key].material.dispose()
                this.meshes[key].geometry.dispose()
                this.meshes[key].clear()
            }
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

const texturesPath: {
    bus_stop_diffuse: string
    trafic_signals_diffuse: string
    stop_signals_diffuse: string
    guidepost_diffuse: string
    subway_stop_diffuse: string
    tram_stop_diffuse: string
} = {
    bus_stop_diffuse: 'assets/models/bus_stop/diffuse.png',
    trafic_signals_diffuse: 'assets/models/trafic_signals/diffuse.jpg',
    stop_signals_diffuse: 'assets/models/stop_signals/diffuse.png',
    guidepost_diffuse: 'assets/models/guidepost/diffuse.png',
    subway_stop_diffuse: 'assets/models/subway_stop/diffuse.png',
    tram_stop_diffuse: 'assets/models/tram_stop/diffuse.png',
}

const modelsPath: {
    [key in layerNameWithModel]: ModelRessource
} = {
    street_lamp: { "path": 'assets/models/street_lamp/street_lamp.glb', scale: 3, rotation: 0, useGroups: false },
    bus_stop: { "path": 'assets/models/bus_stop/bus_stop.glb', scale: 3, rotation: Math.PI / 2, useGroups: false },
    trafic_signals: { "path": 'assets/models/trafic_signals/trafic_signals.glb', scale: 0.02, rotation: -Math.PI / 4, useGroups: false },
    stop_signals: { "path": 'assets/models/stop_signals/stop_signals.glb', scale: 3, rotation: 0, useGroups: false },
    give_way_signals: { "path": 'assets/models/give_way_signals/give_way_signals.glb', scale: 3, rotation: 0, useGroups: false },
    guidepost: { "path": 'assets/models/guidepost/guidepost.glb', scale: 3, rotation: 0, useGroups: false },
    subway_stop: { "path": 'assets/models/subway_stop/metro.glb', scale: 0.01, rotation: 0, useGroups: true, translateZ: 630 },
}

const typeLayers: { [key in LayerName]: { model?: ModelRessource, diffuse_texture_name?: string } } = {
    street_lamp: {
        model: modelsPath.street_lamp,
    }, bus_stop: {
        model: modelsPath.bus_stop,
        diffuse_texture_name: "bus_stop_diffuse"
    }, trafic_signals: {
        model: modelsPath.trafic_signals,
        diffuse_texture_name: "trafic_signals_diffuse"
    }, stop_signals: {
        model: modelsPath.stop_signals,
        diffuse_texture_name: "stop_signals_diffuse"
    }, give_way_signals: {
        model: modelsPath.give_way_signals,
    }, guidepost: {
        model: modelsPath.guidepost,
        diffuse_texture_name: "guidepost_diffuse"
    }
    , tram_stop: {
        diffuse_texture_name: "tram_stop_diffuse"
    }
    , subway_stop: {
        model: modelsPath.subway_stop,
        diffuse_texture_name: "subway_stop_diffuse"
    }
}

const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()

export class VerticalTrafficSignLayer extends AbstractPointsLayer<VerticalTrafficSignTile> {

    pointMaterial: ShaderMaterial

    private modelsInstancedBufferGeometries: {
        [key in string]: {
            materials?: Array<Material>
            geometry: CustomInstancedBufferGeometry
        }
    } = {}
    private modelsGeometries: CustomInstancedBufferGeometry
    constructor(
        map: Giro3DMap,
        couche: DataOSMLayer,
        min_z: number = 11
    ) {

        super(map, couche, min_z)
        this.loadModels().subscribe()

        this.getPointMaterial().pipe(
            take(1),
            last(),
            tap((material) => {
                this.pointMaterial = material
            })
        ).subscribe()
    }

    updateFeatureZWithBuildingHeight() {

    }

    loadModels() {
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('assets/draco/')

        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)


        const loadGLTF$ = Object.keys(modelsPath).map((key: layerNameWithModel) => {
            return from(gltfLoader.loadAsync(modelsPath[key].path)).pipe(
                last(),
                tap((gltf) => {
                    const useGroups = modelsPath[key].useGroups
                    const geometries: Array<BufferGeometry> = [];
                    const materials: Array<Material> = [];
                    gltf.scene.traverse((child: Mesh) => {
                        if (child.isMesh) {
                            child.updateMatrixWorld();

                            const clonedGeometry = child.geometry.clone();
                            // console.log(clonedGeometry)
                            clonedGeometry.applyMatrix4(child.matrixWorld);
                            geometries.push(clonedGeometry);
                            if (useGroups) {
                                if (child.material instanceof Material) {
                                    const material = child.material.clone()
                                    //  work with MeshPhysicalMaterial, not tested with other materials
                                    material.onBeforeCompile = (shader) => {
                                        this.beforeCompileCustomMaterial(shader)
                                    }
                                    materials.push(material)
                                } else {
                                    throw Error("Material is an array !")
                                }
                            }
                        }
                    });
                    const geometry = mergeGeometries(geometries, useGroups).toNonIndexed()
                    if (modelsPath[key].translateZ) {
                        geometry.translate(0, 0, modelsPath[key].translateZ)
                    }
                    // geometry.center()
                    geometry.scale(modelsPath[key].scale, modelsPath[key].scale, modelsPath[key].scale)
                    // console.log(geometry)
                    // geometry.scale(2, 2, modelsPath[key].scale)
                    geometry.rotateX(modelsPath[key].rotation)

                    this.modelsInstancedBufferGeometries[key] = {
                        // @ts-expect-error
                        geometry: new CustomInstancedBufferGeometry().copy(geometry),
                    };

                    if (useGroups) {
                        this.modelsInstancedBufferGeometries[key]["materials"] = materials
                    }
                })
            )
        })

        return combineLatest(loadGLTF$).pipe(
            last(),
            map(() => {
                this.modelsGeometries = new CustomInstancedBufferGeometry();
                // // @ts-expect-error
                // this.modelsGeometries.copy(new PlaneGeometry(6, 6));

                const maxVertexCount = Math.max(...["street_lamp", "bus_stop", "trafic_signals"].map((key) => this.modelsInstancedBufferGeometries[key].geometry.attributes.position.count));
                const maxUvCount = Math.max(...["street_lamp", "bus_stop", "trafic_signals"].map((key) => this.modelsInstancedBufferGeometries[key].geometry.attributes.uv.count));
                const arrayVertices = new Float32Array(maxVertexCount * 3);
                const arrayUvs = new Float32Array(maxUvCount * 2);
                // arrayVertices.set([0, 0, 0, 0, 0, 0])
                // arrayVertices.set(this.modelsGeometries.attributes.position.array)
                // arrayUvs.set(this.modelsGeometries.attributes.uv.array)

                this.modelsGeometries.setAttribute("position", new BufferAttribute(arrayVertices, 3));
                this.modelsGeometries.setAttribute("uv", new BufferAttribute(arrayUvs, 2));
                // this.modelsGeometries = mergeGeometries(["street_lamp", "bus_stop", "trafic_signals"].map((key) => this.modelsInstancedBufferGeometries[key].geometry));

                ["street_lamp", "bus_stop", "trafic_signals"].map((key) => {
                    const arrayVertices = new Float32Array(maxVertexCount * 3);
                    const arrayUvs = new Float32Array(maxUvCount * 2);
                    arrayVertices.set(this.modelsInstancedBufferGeometries[key].geometry.attributes.position.array)
                    arrayUvs.set(this.modelsInstancedBufferGeometries[key].geometry.attributes.uv.array)
                    // console.log(
                    //     key,
                    //     this.modelsInstancedBufferGeometries[key].geometry.index
                    // )
                    // if (key == "street_lamp") {
                    // this.modelsGeometries.setAttribute("position", new BufferAttribute(arrayVertices, 3))
                    // }
                    this.modelsGeometries.setAttribute(key, new BufferAttribute(arrayVertices, 3))
                    this.modelsGeometries.setAttribute(key + "_uv", new BufferAttribute(arrayUvs, 2))

                    // return this.modelsInstancedBufferGeometries[key].geometry
                })
                // this.modelsGeometries = mergeGeometries(Object.keys(modelsPath).map((key) => this.modelsInstancedBufferGeometries[key].geometry));
                return this.modelsInstancedBufferGeometries
            })
        )
    }

    getAllFeaturesPerTile(features: Feature<Geometry>[], buildingHeightAtFeature = 0): {
        [key: string]:
        {
            features: Array<Feature>,
            instancePositions: Array<Float32Array>
            instanceStickPositions: Array<Float32Array>
        }
    } {

        // Suppose you partition your space into a grid
        const gridSize = 500; // Define grid size
        const partitions = {}; // Object to hold instances per grid cell

        // Organize instances into partitions
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            const geometry = feature.getGeometry() as Point
            const coordinate = geometry.getCoordinates()
            const x = coordinate[0];
            const y = coordinate[1];
            const z = buildingHeightAtFeature;

            // Determine grid cell coordinates
            const cellX = Math.floor(x / gridSize);
            const cellY = Math.floor(y / gridSize);
            const cellZ = Math.floor(z / gridSize);
            const key = `${cellX}_${cellY}_${cellZ}`;

            if (!partitions[key]) {
                partitions[key] = [];
            }

            partitions[key].push({ x, y, z, index: i, cellX, cellY });
        }

        const pointTileFeaturesMap: {
            [key: string]:
            {
                features: Array<Feature>,
                instancePositions: Array<Float32Array>
                instanceStickPositions: Array<Float32Array>
            }
        }
            = {}

        for (const key in partitions) {
            const instances = partitions[key];
            const instanceCount = instances.length;
            tmpBox3.setFromArray([].concat(...instances.map((inst) => [inst.x, inst.y, inst.z]))).getCenter(tmpVec3);

            this.createNewTile(VerticalTrafficSignTile, key, tmpVec3.x, tmpVec3.y)
            pointTileFeaturesMap[key] = {
                features: [],
                instancePositions: [],
                instanceStickPositions: [],
            }
            for (let i = 0; i < instanceCount; i++) {
                const instance = instances[i];
                const instancePosition = new Float32Array(3);
                const instanceStickPosition = new Float32Array(4);

                pointTileFeaturesMap[key].features.push(features[instance.index])
                pointTileFeaturesMap[key].instancePositions.push(instancePosition)
                pointTileFeaturesMap[key].instanceStickPositions.push(instanceStickPosition)

                instancePosition[0] = instance.x - tmpVec3.x
                instancePosition[1] = instance.y - tmpVec3.y
                instancePosition[2] = instance.z

                instanceStickPosition[0] = instance.x - tmpVec3.x
                instanceStickPosition[1] = instance.y - tmpVec3.y
                instanceStickPosition[2] = 0
                instanceStickPosition[3] = instance.z

            }
        }
        // for (let index = 0; index < features.length; index++) {
        //     const feature = features[index];
        //     const geometry = feature.getGeometry() as Point
        //     const coordinate = geometry.getCoordinates();

        //     const pointTile = this.getPointsTile(tmpVec2.set(
        //         coordinate[0], coordinate[1]
        //     ), VerticalTrafficSignTile, 300)

        //     if (!pointTileFeaturesMap[pointTile.key]) {
        //         pointTileFeaturesMap[pointTile.key] = {
        //             features: [],
        //             instancePositions: [],
        //             instanceStickPositions: [],
        //         }
        //     }

        //     const instancePosition = new Float32Array(3);
        //     const instanceStickPosition = new Float32Array(4);
        //     pointTileFeaturesMap[pointTile.key].features.push(
        //         feature
        //     )

        //     pointTileFeaturesMap[pointTile.key].instancePositions.push(
        //         instancePosition
        //     )
        //     pointTileFeaturesMap[pointTile.key].instanceStickPositions.push(
        //         instanceStickPosition
        //     )



        //     instancePosition[0] = coordinate[0] - pointTile.position.x
        //     instancePosition[1] = coordinate[1] - pointTile.position.y
        //     instancePosition[2] = buildingHeightAtFeature

        //     instanceStickPosition[0] = coordinate[0] - pointTile.position.x
        //     instanceStickPosition[1] = coordinate[1] - pointTile.position.y
        //     instanceStickPosition[2] = 0
        //     instanceStickPosition[3] = buildingHeightAtFeature

        // }

        return pointTileFeaturesMap
    }

    //@ts-expect-error
    addFeaturesInMesh(new_features: Array<Feature> = []) {

        // this.loaded_features_count = this.vectorSource.getFeatures().length
        // // @ts-expect-error
        // "street_lamp", "bus_stop", "trafic_signals", "stop_signals", "give_way_signals"
        const typeLayerNames: LayerName[] = ["street_lamp", "bus_stop", "trafic_signals"]
        // const typeLayerNames: LayerName[] = Object.keys(typeLayers)

        // const typeLayerNames = ["tram_stop"]
        // for (let i = 0; i < typeLayerNames.length; i++) {
        // const typeLayerName = typeLayerNames[i]
        // const typeLayer = typeLayers[typeLayerName]

        const features = this.vectorSource.getFeatures().filter((f) => typeLayerNames.indexOf(f.getProperties()["type_layer"]) != -1)
        // if (features.length == 0) {
        //     continue
        // }
        // console.log(typeLayerName, features)

        // If layer have model, we put it on the ground, else we elevate it
        let buildingHeightAtFeature = 0
        // if (typeLayer.model == undefined) {
        //     buildingHeightAtFeature = 10
        // }
        const pointTileFeaturesMap = this.getAllFeaturesPerTile(features, buildingHeightAtFeature)

        for (const key in pointTileFeaturesMap) {
            const element = pointTileFeaturesMap[key];
            const pointTile = this._tileSets.get(key)

            const mesh = pointTile.meshes.pointMesh
            // const mesh = pointTile.meshes[typeLayerName]
            const featureUid = new Int32Array(element.features.length)
            const featuresSide = new Int32Array(element.features.length)
            const featuresRotation = new Float32Array(element.features.length)
            element.features.map((feature, index) => {
                featureUid[index] = parseInt(getUid(feature))
                let angle = feature.getProperties()["angle"]

                // console.log(
                //     feature.getProperties()["side"],
                //     angle
                // )
                // http://localhost:4200/map?profil=15&layers=735,62,layer&pos=258868.1,6246240.4,151.1,258806,6246405.7,-2
                if (feature.getProperties()["side"] > 0) {
                    // featuresRotation[index] = angle
                    featuresRotation[index] = angle - Math.PI / 2
                } else {
                    // featuresRotation[index] = angle
                    featuresRotation[index] = angle + Math.PI / 2
                }
                featuresSide[index] = feature.getProperties()["side"]
            })


            // if (typeLayer.model != undefined) {
            // // @ts-expect-error
            // const geometry = new CustomInstancedBufferGeometry().copy(this.modelsGeometries)
            const geometry = this.modelsGeometries.clone();

            // const geometry = this.modelsInstancedBufferGeometries[typeLayerName].geometry
            geometry.instanceCount = element.features.length
            const instancesPositions = mergeFloat32(element.instancePositions)
            tmpBox3.setFromArray(instancesPositions)
            // tmpBox3.applyMatrix4(pointTile.matrixWorld)
            const instanceTypes = new Float32Array(element.features.length);

            for (let i = 0; i < typeLayerNames.length; i++) {
                this.vectorSource.getFeatures().filter((f) => f.getProperties()["type_layer"] == typeLayerNames[i]).map((f) => {
                    instanceTypes[i] = i;
                })
            }
            geometry.setAttribute('aInstanceType', new InstancedBufferAttribute(instanceTypes, 1));
            geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(instancesPositions, 3));
            geometry.setAttribute("aFeatureUid", new InstancedBufferAttribute(featureUid, 1));
            geometry.setAttribute("aRotation", new InstancedBufferAttribute(featuresRotation, 1));
            geometry.boundingBox = tmpBox3
            geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere)
            mesh.geometry.dispose()
            mesh.geometry = geometry


            // console.log(
            //     geometry
            //     // tmpBox3.clone().applyMatrix4(pointTile.matrixWorld)
            // )
            // mesh.material.uniforms = { ...mesh.material.uniforms, "uTextureDiffuseIndex": { value: Object.keys(texturesPath).findIndex(name => name == typeLayer.diffuse_texture_name) + 1 } }

            // if (this.modelsInstancedBufferGeometries[typeLayerName].materials) {

            //     // As known we consider if mesh have multiple materials, there are already the provided one's
            //     if (Array.isArray(mesh.material) == false) {
            //         mesh.material.dispose()
            //         // @ts-expect-error
            //         mesh.material = this.modelsInstancedBufferGeometries[typeLayerName].materials
            //         mesh.material.needsUpdate = true
            //     }

            // }
            mesh.updateMatrix()

            pointTile.updateMatrixWorld();
            // } 
            // else {
            //     const stickMesh = pointTile.stickMeshes.stickMesh

            //     const geometry = this.getPointGeometry()
            //     const stickGeometry = this.getStickGeometry()

            //     geometry.instanceCount = element.features.length
            //     stickGeometry.instanceCount = element.features.length

            //     geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(mergeFloat32(element.instancePositions), 3));
            //     geometry.setAttribute("aFeatureUid", new InstancedBufferAttribute(featureUid, 1));
            //     stickGeometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(mergeFloat32(element.instanceStickPositions), 4));

            //     mesh.geometry.dispose()
            //     stickMesh.geometry.dispose()

            //     mesh.geometry = geometry
            //     stickMesh.geometry = stickGeometry

            //     mesh.material.dispose()
            //     mesh.material = this.pointMaterial

            //     mesh.material.uniforms = { ...mesh.material.uniforms, "uTextureDiffuseIndex": { value: Object.keys(texturesPath).findIndex(name => name == typeLayer.diffuse_texture_name) + 1 } }
            //     mesh.material.needsUpdate = true

            //     mesh.updateMatrix()
            //     stickMesh.updateMatrix()

            //     pointTile.updateMatrixWorld();
            // }



        }

        // }

        this.instance.notifyChange([this.camera])

    }

    getPointGeometry() {
        // @ts-expect-error
        const geometry = new CustomInstancedBufferGeometry().copy(new PlaneGeometry(30, 30));
        // geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(new Float32Array([]), 3));
        return geometry
    }

    getTexture() {
        this.loader = new TextureLoader()
        const textures: {
            bus_stop_diffuse: Texture,
            trafic_signals_diffuse: Texture,
            stop_signals_diffuse: Texture,
            guidepost_diffuse: Texture,
            subway_stop_diffuse: Texture,
            tram_stop_diffuse: Texture
        } = {
            bus_stop_diffuse: undefined,
            trafic_signals_diffuse: undefined,
            stop_signals_diffuse: undefined,
            guidepost_diffuse: undefined,
            subway_stop_diffuse: undefined,
            tram_stop_diffuse: undefined,
        }


        const loadTextures$ = Object.keys(texturesPath).map((key) => {
            return from(this.loader.loadAsync(texturesPath[key])).pipe(
                tap((texture) => {
                    // texture.colorSpace = SRGBColorSpace;
                    texture.magFilter = LinearFilter
                    texture.minFilter = LinearMipmapLinearFilter;
                    // texture.wrapS = RepeatWrapping;
                    // texture.wrapT = RepeatWrapping;
                    texture.anisotropy = 16
                    texture.flipY = false


                    textures[key] = texture
                })
            )
        })
        return merge(this.loadModels(), combineLatest(loadTextures$)).pipe(
            last(),
            map(() => {
                return textures
            })
        )
    }

    uniformFromTexture(texture) {
        return {
            uBusStopDiffuse: { value: texture.bus_stop_diffuse },
            uTrafficSignalsDiffuse: { value: texture.trafic_signals_diffuse },
            uStopSignalsDiffuse: { value: texture.stop_signals_diffuse },
            uGuidePostDiffuse: { value: texture.guidepost_diffuse },
            uSubwayStopDiffuse: { value: texture.subway_stop_diffuse },
            uTramStopDiffuse: { value: texture.tram_stop_diffuse },
        }
    }

    getPointMaterial() {
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
                        uniform sampler2D uBusStopDiffuse;
                        uniform sampler2D uTrafficSignalsDiffuse;
                        uniform sampler2D uStopSignalsDiffuse;
                        uniform sampler2D uGuidePostDiffuse;
                        uniform sampler2D uSubwayStopDiffuse;
                        uniform sampler2D uTramStopDiffuse;

                        uniform int uTextureDiffuseIndex;

                        varying vec2 vUv;

                        void main(){
                            vec4 textureColor = vec4(1.0,1.0,1.0,1.0);

                            if (uTextureDiffuseIndex == 1){
                                textureColor = texture2D(uBusStopDiffuse, vUv);
                            }else if (uTextureDiffuseIndex == 2){
                                textureColor = texture2D(uTrafficSignalsDiffuse, vUv);
                            }else if (uTextureDiffuseIndex == 3){
                                textureColor = texture2D(uStopSignalsDiffuse, vUv);
                            }else if (uTextureDiffuseIndex == 4){
                                textureColor = texture2D(uGuidePostDiffuse, vUv);
                            }else if (uTextureDiffuseIndex == 5){
                                textureColor = texture2D(uSubwayStopDiffuse, vUv);
                            }else if (uTextureDiffuseIndex == 6){
                                textureColor = texture2D(uTramStopDiffuse, vUv);
                            }

                            if (textureColor.a != 1.0){
                            discard;
                            }
                            gl_FragColor = textureColor;
                        }
                        `,
                    uniforms: {
                        ...this.uniformFromTexture(texture),
                        quaternion: { value: this.camera.quaternion.clone().invert() },
                        fogColor: { value: (this.instance.scene.fog as Fog).color },
                        fogNear: { value: (this.instance.scene.fog as Fog).near },
                        fogFar: { value: (this.instance.scene.fog as Fog).far },
                    },
                }
                )

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
                    // transparent: true,
                    fog: true,
                    vertexShader: `
                        uniform vec4 quaternion;
                        
                        attribute vec3 trafic_signals;
                        attribute vec3 street_lamp;
                        attribute vec3 bus_stop;

                        attribute vec2 trafic_signals_uv;
                        attribute vec2 street_lamp_uv;
                        attribute vec2 bus_stop_uv;

                        attribute vec3 aInstancePosition;
                        attribute float aRotation;
                        attribute float aInstanceType;
                        
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        varying vec3 vViewPosition;
                        varying float vInstanceType;

                        void main(){
                            vUv = street_lamp_uv;
                            vInstanceType = aInstanceType;
                            vNormal = normalize(normal);


                            vec3 transformedPosition = position;

                            if (aInstanceType == 0.0) {
                                transformedPosition = street_lamp;
                                vUv = street_lamp_uv;
                            }if (aInstanceType == 1.0) {
                                transformedPosition = bus_stop;
                                vUv = bus_stop_uv;
                            }if (aInstanceType == 2.0) {
                                transformedPosition = trafic_signals;
                                vUv = trafic_signals_uv;
                            }
                            // transformedPosition = trafic_signals;
                            // vUv = trafic_signals_uv;

                            // Rotation around the Z-axis
                            float cosR = cos(aRotation);
                            float sinR = sin(aRotation);

                            mat3 rotationMatrix = mat3(
                                cosR, -sinR, 0.0,
                                sinR,  cosR, 0.0,
                                0.0,   0.0,  1.0
                            );

                            vec3 pos =rotationMatrix * transformedPosition + aInstancePosition ;
                            // vec3 rotatedPosition = rotationMatrix * pos;

                            vec3 vPosition = normalize(-vec3(modelViewMatrix * vec4(transformedPosition, 1.0)).xyz);

                            vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
                            vec3 vViewPosition = -mvPosition.xyz;

                            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0);

                        }
                        `,
                    fragmentShader: `
                        uniform sampler2D uBusStopDiffuse;
                        uniform sampler2D uTrafficSignalsDiffuse;
                        uniform sampler2D uStopSignalsDiffuse;
                        uniform sampler2D uGuidePostDiffuse;
                        uniform sampler2D uSubwayStopDiffuse;

                        varying float vInstanceType;

                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        varying vec3 vViewPosition;

                        void main(){

                            vec4 textureColor = vec4(1.0,1.0,1.0,1.0);

                            if (vInstanceType == 1.0){
                                textureColor = texture2D(uBusStopDiffuse, vUv);
                            }else if (vInstanceType == 2.0){
                                textureColor = texture2D(uTrafficSignalsDiffuse, vUv);
                            }else if (vInstanceType == 3.0){
                                textureColor = texture2D(uStopSignalsDiffuse, vUv);
                            }else if (vInstanceType == 4.0){
                                textureColor = texture2D(uGuidePostDiffuse, vUv);
                            }else if (vInstanceType == 5.0){
                                textureColor = texture2D(uSubwayStopDiffuse, vUv);
                            }

                            vec3 uKd = vec3(1.0, 1.0, 1.0);
                            vec3 uKs = vec3(0.5, 0.5, 0.5);
                            float uNs = 30.0;

                            vec3 normal = normalize(vNormal);
                            vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.75));
                            float lightIntensity = max(dot(normal, lightDirection), 1.0);
                            vec3 diffuse = lightIntensity * textureColor.rgb * uKd;

                            vec3 viewDirection = vPosition;
                            vec3 reflectDirection = reflect(-lightDirection, normal);
                            float specularFactor = pow(max(dot(viewDirection, reflectDirection), 0.0), uNs);
                            vec3 specular = specularFactor * uKs;

                            vec3 color = diffuse + specular;

                            gl_FragColor = vec4(color, textureColor.a);
                            gl_FragColor = vec4(0.0,0.0,1.0,1.0);
                            // gl_FragColor = vec4(vUv,0.0,1.0);


                        }
                        `,
                    uniforms: {
                        ...this.uniformFromTexture(texture),
                        fogColor: { value: (this.instance.scene.fog as Fog).color },
                        fogNear: { value: (this.instance.scene.fog as Fog).near },
                        fogFar: { value: (this.instance.scene.fog as Fog).far },
                    },
                }
                )

            })
        )

    }

    beforeCompileCustomMaterial(shader: WebGLProgramParametersWithUniforms) {
        shader.vertexShader = shader.vertexShader.replace('#include <batching_pars_vertex>', `
            #include <batching_pars_vertex>
            attribute vec3 aInstancePosition;
        `)
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            #include <project_vertex>
            vec3 pos = position + aInstancePosition ;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0);
        
        `)
    }


}

// void main(){
//     vec4 textureColor = texture2D(uTrafficSignalsDiffuse, vUv);

//     vec3 uKd = vec3(1.0, 1.0, 1.0);
//     vec3 uKs = vec3(0.5, 0.5, 0.5);
//     float uNs = 30.0;

//     vec3 normal = normalize(vNormal);
//     vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.75));
//     float lightIntensity = max(dot(normal, lightDirection), 1.0);
//     vec3 diffuse = lightIntensity * textureColor.rgb * uKd;

//     vec3 viewDirection = vPosition;
//     vec3 reflectDirection = reflect(-lightDirection, normal);
//     float specularFactor = pow(max(dot(viewDirection, reflectDirection), 0.0), uNs);
//     vec3 specular = specularFactor * uKs;

//     vec3 color = diffuse + specular;

//     gl_FragColor = vec4(color, textureColor.a);


// }

// void main(){
//     vec4 textureColor = texture2D(uStopSignalsDiffuse, vUv);

//     vec3 uKd = vec3(1.0, 1.0, 1.0);
//     vec3 uKs = vec3(0.5, 0.5, 0.5);
//     float uNs = 30.0;

//     vec3 normal = normalize(vNormal);
//     vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.75));
//     float lightIntensity = max(dot(normal, lightDirection), 1.0);
//     vec3 diffuse = lightIntensity * textureColor.rgb * uKd;

//     vec3 viewDirection = vPosition;
//     vec3 reflectDirection = reflect(-lightDirection, normal);
//     float specularFactor = pow(max(dot(viewDirection, reflectDirection), 0.0), uNs);
//     vec3 specular = specularFactor * uKs;

//     vec3 color = diffuse + specular;

//     gl_FragColor = vec4(color, textureColor.a);

// }