import { AddEquation, AdditiveBlending, AlwaysDepth, AlwaysStencilFunc, BatchedMesh, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, CustomBlending, DataArrayTexture, DataTexture, DirectionalLight, DoubleSide, EqualDepth, FloatType, Fog, FrontSide, Frustum, GLSL3, GreaterDepth, GreaterEqualDepth, Group, InstancedBufferGeometry, InstancedMesh, LessDepth, Material, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NearestFilter, NeverDepth, NormalBufferAttributes, Object3D, OneFactor, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, ReplaceStencilOp, RGBAFormat, Scene, ShaderChunk, ShaderLib, ShaderMaterial, Sphere, Texture, TypedArray, UniformsLib, UniformsUtils, Vector2, Vector3, WebGLRenderTarget, ZeroFactor } from "three";
import { concatMap, debounceTime, delay, filter, retryWhen, map as rxjsMap, take, takeUntil, tap } from "rxjs/operators"
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, Coordinates, BaseMessageMap, WorkerPool, tile } from "../giro-3d-module";
import { Feature, GeometryLayout, MVT, Polygon, TileState, VectorTileSource, GeoJSON, FeatureLike, getCenter, VectorSource, Extent, Coordinate, Geometry, MultiPolygon, Point } from "../ol-module";

import { BuildingProperties, PolygonOptions, RetrieveBuilding, RetrievePoint, RetrieveProjected, SourceFeature, SourceProperties } from "./building/type";

import { SelectableMesh } from "./custom-mesh";

import CSM from 'three-csm';

import { SunSystem } from "./sunSystem";
import { LightAndShadowSystem } from "./lightAndShadowSystem";
import { Tile3DInstanceType } from "./polygon/tile3d-projected-geometry-builder";

// Load custom shaders
import buildingCommon from "../../assets/shaders/building.common.glsl";

import PointFragment from "../../assets/shaders/point.fragment.glsl";
import PointVertex from "../../assets/shaders/point.vertex.glsl";
import { chdir } from "process";
import Vec2 from "./math/vector2";

ShaderChunk['building_common'] = buildingCommon;


const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()
const tempMatrix4 = new Matrix4()

const LAYER_VECTOR_SOURCE_ID = "pointSource"
const POINT_DESCRIPTION_SHEET = "point"
const POINT_DESCRIPTION_SHEET_TITLE = "point"

class PointTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'PointTile';
    key: string

    userData: {

    };
    loadMeshes: {
        id: string
        lod0: InstancedMesh,
        lod1?: InstancedMesh
    }[] = []


    updateLod(camera: PerspectiveCamera) {
        if (!this.visible) return

        const tileDistanceToCamera = Math.abs(Vec2.distance(new Vec2(this.position.x, this.position.y), new Vec2(camera.position.x, camera.position.y)))

        if (tileDistanceToCamera <= 3500) {
            this.loadMeshes.forEach(child => {
                if (Boolean(child.lod1)) {
                    if (!child.lod0.visible) {
                        child.lod0.visible = true
                    }
                    if (child.lod1.visible) {
                        child.lod1.visible = false
                    }
                }
            })

        } else if (tileDistanceToCamera <= 7000) {
            this.loadMeshes.forEach(child => {
                if (Boolean(child.lod1)) {
                    if (child.lod0.visible) {
                        child.lod0.visible = false
                    }
                    if (!child.lod1.visible) {
                        child.lod1.visible = true
                    }
                }
            })
        } else {
            this.loadMeshes.forEach(child => {
                if (Boolean(child.lod1)) {
                    if (child.lod0.visible) {
                        child.lod0.visible = false
                    }
                    if (child.lod1.visible) {
                        child.lod1.visible = false
                    }
                }
            })
        }

        // console.log(
        //     this.children.filter((child) => child.visible).length
        // )

    }


}

export class PointLayer {
    private csm: CSM
    private sunSystem: SunSystem;
    private map: Giro3DMap;
    private instance: Instance;
    private controls: OrbitControls;
    private pointGroup: Group = new Group();
    private pointMaterial: ShaderMaterial
    private pointTexture: DataArrayTexture

    private threeVolumeTexture: Texture

    private _tileSets: Map<string, PointTile> = new Map()
    private glbMap: Map<Tile3DInstanceType, BufferGeometry> = new Map()



    constructor(map: Giro3DMap,
        private groundTileVectorSource: VectorTileSource,
        csm: CSM,
        sunSystem: SunSystem
    ) {
        this.sunSystem = sunSystem
        this.csm = csm

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.pointGroup.name = "point"
        this.pointGroup.matrixAutoUpdate = false
        this.instance.add(this.pointGroup)

        setInterval(() => {
            if (this.pointGroup.visible) {

                this.pointGroup.children.forEach((tile: PointTile) => {
                    tile.updateLod(this.instance.view.camera as PerspectiveCamera)
                })
            }

        }, 200)
    }

    currentZoomChanged(zoom: number) {
        if (zoom < 16 && this.pointGroup.visible) {
            this.pointGroup.visible = false
        } else if (zoom >= 16 && !this.pointGroup.visible) {
            this.pointGroup.visible = true
            this.instance.notifyChange()
        }
    }

    getPointTile(coordinate: Vector2): [boolean, PointTile] {


        const scene = this.instance.scene

        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        const isTileAlreadyCreated = this._tileSets.has(tile_key)
        if (isTileAlreadyCreated) {
            return [true, this._tileSets.get(tile_key)]
        }

        const newProjectedTile = new PointTile()
        newProjectedTile.key = tile_key
        newProjectedTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )

        this.pointGroup.add(newProjectedTile)

        this._tileSets.set(tile_key, newProjectedTile)
        return [false, newProjectedTile]
    }

    setBuildingMeshSkyTexture(object: SelectableMesh | ShaderMaterial) {

        let materialToUpdate: ShaderMaterial
        if (object instanceof SelectableMesh) {
            materialToUpdate = object.material
        } else if (object instanceof ShaderMaterial) {
            materialToUpdate = object
        } else {
            throw new Error("No mesh or material provided")
        }
        const environmentTextureProperties = this.sunSystem.getSkyTexture()
        materialToUpdate.defines.CUBEUV_TEXEL_WIDTH = environmentTextureProperties.CUBEUV_TEXEL_WIDTH
        materialToUpdate.defines.CUBEUV_TEXEL_HEIGHT = environmentTextureProperties.CUBEUV_TEXEL_HEIGHT
        materialToUpdate.defines.CUBEUV_MAX_MIP = environmentTextureProperties.CUBEUV_MAX_MIP + ".0"
        if (!Boolean(materialToUpdate.uniforms.envMap)) {
            materialToUpdate.uniforms.envMap = {
                value: environmentTextureProperties.texture
            }
            materialToUpdate.uniforms.envMapIntensity.value = 0.7
        } else {
            materialToUpdate.uniforms.envMap.value = environmentTextureProperties.texture
            materialToUpdate.uniforms.envMapIntensity.value = 0.7
        }

    }



    getPointMaterial() {
        let pointMaterial: ShaderMaterial

        if (!this.pointMaterial) {
            const physicalUniforms = ShaderLib.physical.uniforms

            physicalUniforms.diffuse.value = new Color().setRGB(0, 0, 0)
            physicalUniforms.emissive.value = new Color().setRGB(0, 0, 0)


            this.pointMaterial = new ShaderMaterial({
                side: DoubleSide,
                fog: true,
                lights: true,
                vertexShader: PointVertex,
                fragmentShader: PointFragment,
                transparent: true,
                uniforms: physicalUniforms,
                // attenuationColor: new Color().setRGB(0, 0, 0) ,
                // alphaTest: 0.5,
                // depthWrite: false,
                // depthTest: false,
                // depthFunc: GreaterDepth,

                // polygonOffset: true,
                // polygonOffsetFactor: -1,
                // polygonOffsetUnits: -2,
                defines: {
                    'STANDARD': '',
                    'PHYSICAL': '',
                    'USE_ENVMAP': '',
                    'ENVMAP_TYPE_CUBE_UV': '',
                    // 'USE_SHEEN': '',
                }
            })

            pointMaterial = this.pointMaterial
        } else {
            pointMaterial = this.pointMaterial.clone()
        }

        this.csm.setupMaterial(pointMaterial);
        if (!Boolean(pointMaterial.uniforms.tMapPoint)) {

            pointMaterial.uniforms.tMapPoint = {
                value: this.pointTexture
            }
        }
        if (!Boolean(pointMaterial.uniforms.tSkyTexture)) {
            this.setBuildingMeshSkyTexture(pointMaterial)
        }

        return pointMaterial
    }

    setPointTexture(pointTexture: DataArrayTexture, threeVolumeTexture: Texture) {
        if (this.pointTexture) {
            return
        }
        this.threeVolumeTexture = threeVolumeTexture
        this.pointTexture = pointTexture
    }

    setGeometries(glbs: Array<{ name: Tile3DInstanceType, geometry: BufferGeometry }>) {
        for (const glb of glbs) {
            this.glbMap.set(glb.name, glb.geometry)
        }
    }

    loadFeatures(tileResults: RetrievePoint[]) {
        // console.log(tileResults)
        if (tileResults.length === 0) return
        for (let index = 0; index < tileResults.length; index++) {
            const tile = tileResults[index];
            this.loadTile(tile)
        }
    }

    loadTile(tile: RetrievePoint) {

        const x = tile.worldBuildingPosition[0]
        const y = tile.worldBuildingPosition[1]

        const [isTileAlreadyCreated, pointTile] = this.getPointTile(new Vector2(x, y))

        this.loadFeatureInScene(tile, pointTile)

    }

    loadLod0(tile: RetrievePoint, pointTile: PointTile) {
        tmpBox3.setFromArray(tile.boundingBoxMinMax)
        tmpBox3.getBoundingSphere(tmpSphere).clone()

        for (let index = 0; index < tile.data.length; index++) {
            const data = tile.data[index]
            const geometry = this.glbMap.get(data.instanceType).clone()
            this.addConstAttribute(geometry, 'textureId', data.lod0.instanceTypeTextureIdMap.get(data.instanceType))
            const instanceCount = data.lod0.matrices.length

            const instancedMesh = this.getInstancedMesh(geometry, instanceCount, data.instanceType)

            data.lod0.matrices.forEach((matrice, index) => {
                tempMatrix4.fromArray(matrice)
                instancedMesh.setMatrixAt(index, tempMatrix4)
            })

            // instancedMesh.receiveShadow = true
            instancedMesh.castShadow = true
            instancedMesh.userData.name = POINT_DESCRIPTION_SHEET_TITLE
            instancedMesh.userData.couche_id = LAYER_VECTOR_SOURCE_ID
            instancedMesh.userData.descriptionSheetCapabilities = POINT_DESCRIPTION_SHEET
            instancedMesh.userData.tileKey = tile.tile_key

            instancedMesh.geometry.boundingBox = tmpBox3.clone()
            instancedMesh.geometry.boundingSphere = tmpSphere.clone()
            instancedMesh.frustumCulled = true

            instancedMesh.updateMatrix()

            let loadMesh = pointTile.loadMeshes.find((m) => m.id === data.instanceType)
            if (!loadMesh) {
                loadMesh = {
                    id: data.instanceType,
                    lod0: instancedMesh
                }
                pointTile.loadMeshes.push(loadMesh)
            } else {
                loadMesh.lod0 = instancedMesh
            }
            pointTile.add(instancedMesh)
        }

        // if (tile.features.map((f) => f.properties.osm_id).indexOf(13175078344) != -1) {
        //     console.log(Array.from(instanceTypeMesh), tile.instanceTypeLod0.filter((t) => t == "busStop").length)
        // }
    }

    loadLod1(tile: RetrievePoint, pointTile: PointTile) {
        tmpBox3.setFromArray(tile.boundingBoxMinMax)
        tmpBox3.getBoundingSphere(tmpSphere).clone()

        for (let index = 0; index < tile.data.length; index++) {
            const data = tile.data[index]
            if (!Boolean(data.lod1)) continue
            const geometry = this.glbMap.get(data.instanceType).clone()
            this.addConstAttribute(geometry, 'textureId', data.lod1.instanceTypeTextureIdMap.get(data.instanceType))
            const instanceCount = data.lod1.matrices.length
            let normalScale = 3
            if (data.instanceType === "tree") {
                normalScale = 999999
            }
            const instancedMesh = this.getInstancedMesh(geometry, instanceCount, data.instanceType)

            data.lod1.matrices.forEach((matrice, index) => {
                tempMatrix4.fromArray(matrice)
                instancedMesh.setMatrixAt(index, tempMatrix4)
            })

            // instancedMesh.receiveShadow = true
            instancedMesh.castShadow = true
            instancedMesh.userData.name = POINT_DESCRIPTION_SHEET_TITLE
            instancedMesh.userData.couche_id = LAYER_VECTOR_SOURCE_ID
            instancedMesh.userData.descriptionSheetCapabilities = POINT_DESCRIPTION_SHEET
            instancedMesh.userData.tileKey = tile.tile_key

            instancedMesh.geometry.boundingBox = tmpBox3.clone()
            instancedMesh.geometry.boundingSphere = tmpSphere.clone()
            instancedMesh.frustumCulled = true

            instancedMesh.updateMatrix()

            let loadMesh = pointTile.loadMeshes.find((m) => m.id === data.instanceType)
            loadMesh.lod1 = instancedMesh

            pointTile.add(instancedMesh)
        }
    }

    loadFeatureInScene(tile: RetrievePoint, pointTile: PointTile) {
        // console.log(tile)
        const t0 = performance.now();

        this.loadLod0(tile, pointTile)
        this.loadLod1(tile, pointTile)


        pointTile.updateMatrixWorld()

        // this.instance.notifyChange(pointTile)
        // console.log(`Temps extrude polygons : ${(performance.now() - t0).toFixed(2)} ms`, tile.tile_key);
    }

    getInstancedMesh(geometry: BufferGeometry, instanceCount: number, instanceType: Tile3DInstanceType) {
        let material = this.getPointMaterial()
        if (instanceType === "tree") {
            material.uniforms.UNormalScale = { value: 1 }
            material.uniforms.UThreeVolumeTexture = { value: this.threeVolumeTexture }
            material.uniforms.specularIntensity.value = 0
            material.uniforms.specularColor.value = new Color().setRGB(0, 0, 0)
            material.uniforms.attenuationColor.value = new Color().setRGB(0, 0, 0)
            material.uniforms.sheen.value = 0
            // //@ts-expect-error
            // material = new MeshStandardMaterial({
            //     // depthWrite: false,
            //     // depthTest: false,
            //     transparent: true,
            //     // blending: NoBlending
            //     color: 0xee82ee,
            //     side: DoubleSide,

            // })
        } else {
            material.uniforms.UNormalScale = { value: 3 }
        }

        return new InstancedMesh(geometry, material, instanceCount)
    }

    addConstAttribute(geom: BufferGeometry, name: string, value: number) {
        const n = geom.getAttribute('position').count;
        const arr = new Float32Array(n);
        arr.fill(value);
        geom.setAttribute(name, new BufferAttribute(arr, 1));
    }
}
