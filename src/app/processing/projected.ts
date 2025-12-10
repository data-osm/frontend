import { AddEquation, AdditiveBlending, AlwaysDepth, AlwaysStencilFunc, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, CustomBlending, DataArrayTexture, DataTexture, DirectionalLight, DoubleSide, EqualDepth, Fog, FrontSide, Frustum, GLSL3, GreaterDepth, GreaterEqualDepth, Group, InstancedBufferGeometry, LessDepth, LinearFilter, Material, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NeverDepth, NormalBufferAttributes, Object3D, OneFactor, OrthographicCamera, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, ReplaceStencilOp, RGBAFormat, Scene, ShaderChunk, ShaderLib, ShaderMaterial, Sphere, Texture, TypedArray, UniformsLib, UniformsUtils, UnsignedByteType, Vector2, Vector3, WebGLRenderTarget, ZeroFactor } from "three";
import { concatMap, debounceTime, delay, filter, retryWhen, map as rxjsMap, take, takeUntil, tap } from "rxjs/operators"
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, Coordinates, BaseMessageMap, Extent, PlanarTileGeometry, HeightMap, readRGRenderTargetIntoRGBAU8Buffer } from "../giro-3d-module";
import { Feature, GeometryLayout, MVT, Polygon, TileState, VectorTileSource, GeoJSON, FeatureLike, getCenter, VectorSource, Coordinate, Geometry, MultiPolygon, Point } from "../ol-module";

import { BuildingProperties, PolygonOptions, RetrieveBuilding, RetrieveHugging, RetrieveProjected, SourceFeature, SourceProperties } from "./building/type";


import { SelectableMesh } from "./custom-mesh";

import CSM from 'three-csm';

// Load custom shaders
import { SunSystem } from "./sunSystem";
import { LightAndShadowSystem } from "./lightAndShadowSystem";

import buildingCommon from "../../assets/shaders/building.common.glsl";

import ProjectedFragment from "../../assets/shaders/projected.fragment.glsl";
import ProjectedVertex from "../../assets/shaders/projected.vertex.glsl";
import TileMesh from "@giro3d/cgiro3d/entities/tiles/TileMesh";
import OffsetScale from "@giro3d/cgiro3d/core/OffsetScale";

ShaderChunk['building_common'] = buildingCommon;



const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const tmpBox3 = new Box3()
const tmpSphere = new Sphere()

const LAYER_VECTOR_SOURCE_ID = "projectedSource"
const PROJECTED_DESCRIPTION_SHEET = "projected"
const PROJECTED_DESCRIPTION_SHEET_TITLE = "projected"

class ProjectedTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'ProjectedTile';
    key: string

    userData: {

    };


}

export class ProjectedLayer {
    private csm: CSM
    private sunSystem: SunSystem;
    private map: Giro3DMap;
    private instance: Instance;
    private controls: OrbitControls;
    private projectedGroup: Group = new Group();
    private projectedMaterial: ShaderMaterial
    projectedTexture: DataArrayTexture
    private _tileSets: Map<string, ProjectedTile> = new Map()

    constructor(
        map: Giro3DMap,
        private groundTileVectorSource: VectorTileSource,
        csm: CSM,
        sunSystem: SunSystem
    ) {

        this.sunSystem = sunSystem
        this.csm = csm

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.projectedGroup.name = "projected"
        this.projectedGroup.matrixAutoUpdate = false
        this.instance.add(this.projectedGroup)

        this.sunSystem.datetimeChangedObservable.pipe(
            debounceTime(200),
            tap(() => {
                this.updateBuildingsUniforms({ dateTimeChanged: true })
            })
        ).subscribe()

        this.sunSystem.sunDirectionChangedObservable.pipe(
            debounceTime(2000),
            tap((sunDirection) => {
                this.updateBuildingsUniforms({ updateSunDirection: true })
            })
        ).subscribe()
        this.sunSystem.skyChangedObservable.pipe(
            debounceTime(200),
            tap(() => {
                this.updateBuildingsUniforms({ updateSkyTexture: true })
            })
        ).subscribe()




    }

    setBuildingMeshSunDirection(object: SelectableMesh | ShaderMaterial) {

        let materialToUpdate: ShaderMaterial
        if (object instanceof SelectableMesh) {
            materialToUpdate = object.material
        } else if (object instanceof ShaderMaterial) {
            materialToUpdate = object
        } else {
            throw new Error("No mesh or material provided")
        }
        const sunDirection = this.sunSystem.sunDirection
        tempVec3.set(sunDirection.x, sunDirection.y, sunDirection.z)

        const directionLightIntensity = LightAndShadowSystem.getSunLightIntensity(sunDirection) + ""
        const ambientLightIntensity = LightAndShadowSystem.getAmbientLightIntensity(sunDirection) + ""

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

    updateBuildingsUniforms(options: { updateSunDirection?: boolean, updateSkyTexture?: boolean, dateTimeChanged?: boolean } = {}) {
        this.projectedGroup.traverse((child) => {
            if (child instanceof SelectableMesh) {
                if (options.updateSunDirection) {

                    this.setBuildingMeshSunDirection(child)
                }
                if (options.updateSkyTexture) {
                    // this.setBuildingMeshSkyTexture(child)
                }

            }
        })
        this.instance.notifyChange([this.projectedGroup], { needsRedraw: true, immediate: true })
    }

    getProjectedMaterial() {
        let projectedMaterial: ShaderMaterial

        if (!this.projectedMaterial) {
            const physicalUniforms = ShaderLib.physical.uniforms

            physicalUniforms.diffuse.value = new Color(0x00ff00)
            physicalUniforms.sheen.value = 1.0

            this.projectedMaterial = new ShaderMaterial({
                side: DoubleSide,
                fog: true,
                lights: true,
                vertexShader: ProjectedVertex,
                fragmentShader: ProjectedFragment,
                // transparent: true,
                uniforms: physicalUniforms,
                // depthWrite: false,
                // depthTest: false,
                // depthFunc: GreaterDepth,

                // polygonOffset: true,
                // polygonOffsetFactor: -1,
                // polygonOffsetUnits: -1.0,
                defines: {
                    'STANDARD': '',
                    'PHYSICAL': '',
                    'USE_ENVMAP': '',
                    'ENVMAP_TYPE_CUBE_UV': '',
                    'USE_SHEEN': '',
                }
            })

            projectedMaterial = this.projectedMaterial
        } else {
            projectedMaterial = this.projectedMaterial.clone()
        }

        this.csm.setupMaterial(projectedMaterial);
        if (!Boolean(projectedMaterial.uniforms.tMapp)) {

            projectedMaterial.uniforms.tMapp = {
                value: this.projectedTexture
            }
        }
        if (!Boolean(projectedMaterial.uniforms.tSkyTexture)) {
            this.setBuildingMeshSkyTexture(projectedMaterial)
        }

        this.setBuildingMeshSunDirection(projectedMaterial)
        return projectedMaterial
    }

    setProjectedTexture(projectedTexture: DataArrayTexture) {
        if (this.projectedTexture) {
            return
        }
        // console.log("set projected texture")
        this.projectedTexture = projectedTexture
    }

    getProjectedLayer(coordinate: Vector2): [boolean, ProjectedTile] {


        const scene = this.instance.scene

        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        const isTileAlreadyCreated = this._tileSets.has(tile_key)
        if (isTileAlreadyCreated) {
            return [true, this._tileSets.get(tile_key)]
        }

        const newProjectedTile = new ProjectedTile()

        newProjectedTile.key = tile_key
        newProjectedTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )

        this.projectedGroup.add(newProjectedTile)

        this._tileSets.set(tile_key, newProjectedTile)
        return [false, newProjectedTile]
    }

    currentZoomChanged(zoom: number) {
        if (zoom < 16 && this.projectedGroup.visible) {
            this.projectedGroup.visible = false
        } else if (zoom >= 16 && !this.projectedGroup.visible) {
            this.projectedGroup.visible = true
            this.instance.notifyChange()
        }
    }


    loadFeatures(tileResults: RetrieveProjected[] | RetrieveHugging[]) {
        // console.log(tileResults)
        for (let index = 0; index < tileResults.length; index++) {
            const tile = tileResults[index];
            if (tile.type === "hugging") {
                this.loadTile(tile)
            }
        }
    }

    loadTile(tile: RetrieveProjected | RetrieveHugging) {

        const x = tile.worldBuildingPosition[0]
        const y = tile.worldBuildingPosition[1]

        const [isTileAlreadyCreated, projectedTile] = this.getProjectedLayer(new Vector2(x, y))

        this.loadFeatureInScene(tile, projectedTile)

    }


    loadFeatureInScene(tile: RetrieveProjected | RetrieveHugging, projectedTile: ProjectedTile) {

        const geometry = new BufferGeometry()

        tile.extrudeResult.geometryAttribute.forEach((geometryJson) => {
            geometry.setAttribute(geometryJson.key, new BufferAttribute(geometryJson.array, geometryJson.itemSize, geometryJson.normalized))
        })
        const material = this.getProjectedMaterial()

        if (tile.type === "hugging") {
            material.depthWrite = true
            material.transparent = true
        } else {
            material.depthWrite = false
            material.transparent = false
        }
        // this.addElevationTexture(tile, material)
        material.needsUpdate = true

        // const building = new SelectableMesh(geometry, material)
        const projected = new Mesh(geometry, material)
        projected.renderOrder = 999;

        // projected.castShadow = true
        projected.receiveShadow = true
        projected.userData.name = PROJECTED_DESCRIPTION_SHEET_TITLE
        projected.userData.couche_id = LAYER_VECTOR_SOURCE_ID
        projected.userData.descriptionSheetCapabilities = PROJECTED_DESCRIPTION_SHEET
        projected.userData.tileKey = tile.tile_key

        tmpBox3.setFromArray(tile.extrudeResult.boundingBoxMinMax)
        projected.geometry.boundingBox = tmpBox3.clone()
        projected.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere).clone()
        projected.frustumCulled = true


        // We have to keep uniforms of the old projected mesh if exist
        if (projectedTile.children.length > 0) {
            console.log("tu fou quoi ici", tile.z, projectedTile.children)
            // projected.material.uniforms = (projectedTile.children[0] as SelectableMesh).material.uniforms
        }

        projectedTile.add(projected)
        projectedTile.updateMatrixWorld()

        this.instance.notifyChange(projectedTile)

    }
}