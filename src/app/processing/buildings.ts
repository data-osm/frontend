import { AddEquation, AdditiveBlending, AlwaysDepth, AlwaysStencilFunc, Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, CustomBlending, DataArrayTexture, DirectionalLight, DoubleSide, Fog, FrontSide, Frustum, GLSL3, GreaterDepth, Group, InstancedBufferGeometry, LessDepth, Material, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NormalBufferAttributes, Object3D, OneFactor, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, ReplaceStencilOp, Scene, ShaderChunk, ShaderLib, ShaderMaterial, Sphere, Texture, TypedArray, UniformsLib, UniformsUtils, Vector2, Vector3, WebGLRenderTarget, ZeroFactor } from "three";
import { concatMap, debounceTime, delay, filter, retryWhen, map as rxjsMap, take, takeUntil, tap } from "rxjs/operators"
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, Coordinates, BaseMessageMap, WorkerPool } from "../giro-3d-module";
import { Feature, GeometryLayout, MVT, Polygon, TileState, VectorTileSource, GeoJSON, FeatureLike, getCenter, VectorSource, Extent, Coordinate, Geometry, MultiPolygon, Point } from "../ol-module";
import { fromInstanceGiroEvent, fromMapGiroEvent } from "../shared/class/fromGiroEvent";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper, CustomVectorSource, getAllFeaturesInVectorTileSource, getFeaturesFromTileCoord } from "../../helper/carto.helper";
import { Projection, transform } from "ol/proj";
import { BehaviorSubject, forkJoin, of, ReplaySubject } from "rxjs";
import { TileCoord } from "ol/tilecoord";
import { BufferGeometryUtils, EffectComposer, RenderPass, UnrealBloomPass, VertexNormalsHelper } from "three/examples/jsm/Addons";
import Earcut from 'earcut';
import Flatbush from 'flatbush';

import { FeaturesStoreService, OsmFeatureToChange } from "../data/store/features.store.service";
import { AppInjector } from "../../helper/app-injector.helper";
import { environment } from "../../environments/environment";
import { BuildingProperties, PolygonOptions, RetrieveBuilding, SourceFeature, SourceProperties } from "./building/type";
import { Builder, createBuildingPolygons } from "./building/builder";
import { polygon as turf_polygon, featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { LEVEL_HEIGHT } from "./building/building-params";
import VectorRenderTile from "ol/VectorRenderTile";
import { buffer, containsCoordinate, getBottomLeft, getBottomRight, getTopLeft } from "ol/extent";
import { BuildingsTile } from "./building/helper";
import { build3dBuildings } from "./build3dBuilding";
import { SelectableMesh } from "./custom-mesh";
import { getUid, Tile } from "ol";
import listElevation from "./elevation/listElevation";
import WMTSCapabilities from "ol/format/WMTSCapabilities";

import { createListElevationWorker, ElevationFeature, getCapabilities, ListElevationMessageMap, ListElevationsMessageType } from "./elevation/pool";
import { OSMUpdateStoreService } from "../data/store/osm-update.store.service";
import CSM from 'three-csm';
import fragmentShader from "../../assets/shaders/building.fragment.glsl";
import vertexShader from "../../assets/shaders/building.vertex.glsl";

// Load custom shaders
import buildingCommon from "../../assets/shaders/building.common.glsl";
import { WireAttr, WireExtruded } from "./building-processing-worker/worker-packer";
import Vec2 from "./math/vector2";
import { SunSystem } from "./sunSystem";
import Vec3 from "./math/vector3";
import { LightAndShadowSystem } from "./lightAndShadowSystem";

import PhysicalFragment from "../../assets/shaders/physical.fragment.glsl";
import PhysicalVertex from "../../assets/shaders/physical.vertex.glsl";
import computeShadowMask from "../../assets/shaders/compute_shadow_mask.glsl";
import { getRoofParams } from "./building/roof-params";
import { addTile, PackedTiles } from "./building-elevation";
ShaderChunk['building_common'] = buildingCommon;
ShaderChunk['compute_shadow_mask'] = computeShadowMask;
// class WorkerPoolL {
//     current = 0;
//     workers: Worker[]

//     constructor(filePath:string) {
//         WorkerPool
//         this.workers = Array.from({ length: 4 }, () => new Worker(filePath));
//     }

//     dispatchTask(data) {
//         this.workers[this.current].postMessage(data);
//         this.current = (this.current + 1) % this.workers.length;
//     }
// }

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

const LAYER_VECTOR_SOURCE_ID = "buildingSource"
const BUILDING_DESCRIPTION_SHEET = "building"
const BUILDING_DESCRIPTION_SHEET_TITLE = "Bâtiment"

export type MessageType = 'extrudeBuildings';
export interface MessageMap extends BaseMessageMap<MessageType> {
    ExtrudeBuildings: {
        serializableFeatures: {
            flatCoordinates: any;
            ends_: any;
            properties: {
                [x: string]: any;
            };
            feature_id: number;
        }[],
        worldBuildingPosition: Vector3,
        tile_key: string
    };
}



export class BuildingLayer {

    instance: Instance
    map: Giro3DMap
    controls: OrbitControls
    tileLoad$ = new ReplaySubject()
    buildingGroup: Group = new Group()
    _tileSets: Map<string, BuildingsTile> = new Map()

    // private buildingsIndex: Flatbush
    buildingTexture: DataArrayTexture
    noiseTexture: Texture


    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);
    osmUpdateStoreService: OSMUpdateStoreService = AppInjector.get(OSMUpdateStoreService);
    worker: WorkerPool<MessageType, MessageMap> | null
    elevationWorker: WorkerPool<ListElevationsMessageType, ListElevationMessageMap> | null

    buildingVectorSource: CustomVectorSource = new CustomVectorSource({})
    uniqueBuildingPerTile: Map<string, TileCoord> = new Map<string, TileCoord>()

    csm: CSM
    private buildingMaterial: ShaderMaterial

    private buildingHeightFlatBushIndex: PackedTiles = {
        buffer: new ArrayBuffer(Math.max(0, 1 << 20)),
        used: 0,
        // Buffer of FlatBuffer must be a multiple of 8
        align: 8,
        index: [],
        posByTileKey: new Map<string, number>(),
    };

    private tileOSMIDS: Map<string, Set<number>> = new Map<string, Set<number>>()
    private OSMIDProperites: Map<number, SourceProperties> = new Map<number, SourceProperties>()
    private tileFlatBush: Map<string, Flatbush> = new Map<string, Flatbush>()
    // <tileKey,<building flat index, building height>>
    private tileFlatIndexBuildingHeight: Map<string, Map<number, number>> = new Map<string, Map<number, number>>()
    // flatBush index - osm id
    private tileFlatIndexBuildingOsmId: Map<string, Map<number, number>> = new Map<string, Map<number, number>>()
    // need to recreate tiles flatBuffer
    private tileExtents: Map<string, [number, number, number, number]> = new Map<string, [number, number, number, number]>()
    // private tileKeyWithFlatBufferIndex: Map<number, string> = new Map<number, string>()

    private sunSystem: SunSystem
    private buildingVisible: boolean = true

    constructor(
        map: Giro3DMap,
        private groundTileVectorSource: VectorTileSource,
        csm: CSM,
        sunSystem: SunSystem
    ) {
        this.sunSystem = sunSystem
        this.csm = csm
        this.featuresStoreService.addCustomVectorSource(LAYER_VECTOR_SOURCE_ID, this.getFeatureFromOSMId.bind(this))
        // this.featuresStoreService.addLayerVectorSource(
        //     LAYER_VECTOR_SOURCE_ID, this.buildingVectorSource
        // )


        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.buildingGroup.name = "buildings"
        this.buildingGroup.matrixAutoUpdate = false
        this.instance.add(this.buildingGroup)

        this.featuresStoreService.sendRetrieveBuildingHeightEmitter$.start(async (req) => this.getBuildingHeightAtPoint(req))
        // this.buildingGroup.renderOrder = 0

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

        // console.log(this.buildingGroup, "this.buildingGroup")

        // fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
        //     tap(() => {
        //         const frustum = new Frustum();
        //         const projScreenMatrix = new Matrix4();

        //         const camera = this.instance.view.camera as PerspectiveCamera
        //         this.instance.view.camera.updateMatrixWorld();
        //         projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        //         frustum.setFromProjectionMatrix(projScreenMatrix);
        //         this.buildingGroup.traverse((mesh) => {
        //             if (mesh instanceof SelectableMesh) {
        //                 const isInView = frustum.intersectsObject(mesh);
        //                 if (isInView && !mesh.visible) {
        //                     // console.log(isInView)
        //                     mesh.visible = true;
        //                 } else if (!isInView && mesh.visible) {
        //                     mesh.visible = false;
        //                 }
        //             }

        //         })

        //     })
        // ).subscribe()

        // Add ring outline on buildings
        this.osmUpdateStoreService.isOsmBuildingUpdateEnabledObservable.pipe(
            debounceTime(1000),
            tap((enabled) => {
                this.buildingGroup.traverse((obj) => {
                    if (obj instanceof SelectableMesh) {
                        obj.material.uniforms.isRingActive.value = enabled ? 1 : 0
                    }
                })
                this.instance.notifyChange(this.buildingGroup, { immediate: true })
            })
        ).subscribe()

        // Hide a building
        this.featuresStoreService.latestChangedBuildingToHide$.pipe(

            tap(() => {
                const tile_position = this.featuresStoreService.latestChangedBuildingToHide$.getValue()
                if (tile_position == undefined) return
                const hasTile = this._tileSets.has(tile_position)
                if (hasTile) {
                    const [x, y] = tile_position.split("_").map(Number)
                    const tileCoord = this.groundTileVectorSource.tileGrid.getTileCoordForCoordAndZ([x, y], 16)
                    const tileExtent = this.groundTileVectorSource.tileGrid.getTileCoordExtent(tileCoord);
                    const tileRange = this.groundTileVectorSource.tileGrid.getTileRangeForExtentAndZ(buffer(tileExtent, 1), 16);

                    this.groundTileVectorSource.forEachLoadedTile(this.groundTileVectorSource.getProjection(), 16, tileRange, (tile) => {
                        this.extentLoadEnd(this.groundTileVectorSource, [tile as VectorRenderTile], true)
                    })
                }

            })
        ).subscribe()

        // Reload a building tile
        this.featuresStoreService.reloadBuilding$.pipe(
            filter((data) => data != undefined),
            tap((data) => {

                const [x, y] = getCenter(data.geometry.getExtent())


                const tileCoord = this.groundTileVectorSource.tileGrid.getTileCoordForCoordAndZ([x, y], 16)
                const tileExtent = this.groundTileVectorSource.tileGrid.getTileCoordExtent(tileCoord);
                const tileRange = this.groundTileVectorSource.tileGrid.getTileRangeForExtentAndZ(buffer(tileExtent, 1), 16);

                this.groundTileVectorSource.forEachLoadedTile(this.groundTileVectorSource.getProjection(), 16, tileRange, (tile) => {
                    const tileCoord = tile.getTileCoord()
                    const buildingTileCenter = getBottomLeft(this.groundTileVectorSource.tileGrid.getTileCoordExtent(tileCoord))
                    const x = buildingTileCenter[0]
                    const y = buildingTileCenter[1]
                    tempVec2.set(x, y)
                    const [isTileAlreadyCreated, buildingTile] = this.getBuildingsTile(tempVec2)
                    if (buildingTile.children.length > 0) {
                        if ((buildingTile.children[0] as SelectableMesh).hasFeatureId(data.osm_id)) {
                            this.extentLoadEnd(this.groundTileVectorSource, [tile as VectorRenderTile], true)
                        } else {

                        }
                    }


                })

            })
        ).subscribe()

        // Find the closest feature from coordinate and select him
        this.osmUpdateStoreService.closestFeatureToUpdateListener$.pipe(
            filter((coordinate) => coordinate != null),
            tap((coordinate) => {
                const osm_ids_to_exclude = this.osmUpdateStoreService.osmFeaturesInUpdate.map((feat) => feat.osm_id).concat(this.osmUpdateStoreService.ignoredFeatures)
                const { closestFeature, tileKey } = this.getAndZoomToTheClosestBuilding(coordinate, osm_ids_to_exclude)
                this.osmUpdateStoreService.closestFeatureToUpdateReciever$.next(closestFeature)
                if (closestFeature == null) return
                const properties = closestFeature.getProperties()
                this.buildingGroup.traverseVisible((obj) => {
                    if (obj instanceof SelectableMesh) {
                        if (obj.userData.tileKey == tileKey) {
                            obj.setFeatureUidSelected(properties.osm_id);
                        } else if (
                            obj.isSelected
                        ) {
                            obj.clearFeatureSelected()
                        }
                    }
                })

            })
        ).subscribe()

        // Update a building feature
        this.featuresStoreService.updateBuildingFeature.pipe(
            filter((feature) => Boolean(feature)),
            tap((feature) => {
                const properties = this.updateBuildingFeature(feature)
                if (!properties) {
                    return
                }

                this.buildingGroup.traverseVisible((obj) => {
                    if (obj instanceof SelectableMesh) {
                        if (obj.userData.tileKey == properties.tileKey && obj.hasFeatureId(properties.osm_id)) {

                            const buildingIndexes = obj.geometry.attributes.aFeatureUid.array.map(((featureId, index) => {
                                if (featureId == feature.osm_id) {
                                    return index
                                }
                            })).filter(Boolean)
                            buildingIndexes.map((buildingIndex) => {
                                obj.geometry.attributes.aAddOutLine.setX(buildingIndex, 0)
                                return buildingIndex
                            })
                            obj.geometry.attributes.aAddOutLine.needsUpdate = true
                            // this.instance.notifyChange([buildingTile.children[0], this.instance.view.camera], { needsRedraw: true, immediate: true })
                        }
                    }
                })

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


        // if (!materialToUpdate.uniforms.UdirectionLightDirection) {
        //     materialToUpdate.uniforms.UdirectionLightDirection = { value: tempVec3.clone() }
        // } else {

        //     materialToUpdate.uniforms.UdirectionLightDirection.value.copy(tempVec3)
        // }
        // if (!materialToUpdate.uniforms.directionLightColor) {
        //     materialToUpdate.uniforms.directionLightColor = { value: this.sunSystem.sunLightColor.clone() }
        // } else {

        //     materialToUpdate.uniforms.directionLightColor.value.copy(this.sunSystem.sunLightColor)
        // }


        const directionLightIntensity = LightAndShadowSystem.getSunLightIntensity(sunDirection) + ""
        const ambientLightIntensity = LightAndShadowSystem.getAmbientLightIntensity(sunDirection) + ""

        // materialToUpdate.uniforms.directionLightIntensity = { value: directionLightIntensity }
        // materialToUpdate.uniforms.ambientLightIntensity = { value: ambientLightIntensity }
        // materialToUpdate.needsUpdate = true
    }

    setBuildingMeshSkyTexture(object: SelectableMesh | ShaderMaterial) {

        let materialToUpdate: ShaderMaterial
        if (object instanceof SelectableMesh) {
            materialToUpdate = object.material
            // console.log(materialToUpdate)
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

        // materialToUpdate.needsUpdate = true
    }
    updateBuildingsUniforms(options: { updateSunDirection?: boolean, updateSkyTexture?: boolean } = {}) {
        this.buildingGroup.traverse((child) => {
            if (child instanceof SelectableMesh) {
                if (options.updateSunDirection) {

                    this.setBuildingMeshSunDirection(child)
                }
                if (options.updateSkyTexture) {
                    this.setBuildingMeshSkyTexture(child)
                }
            }
        })
    }


    getBuildingMaterial() {
        let buildingMaterial: ShaderMaterial
        if (!this.buildingMaterial) {
            const physicalUniforms = ShaderLib.physical.uniforms

            physicalUniforms.diffuse.value = new Color(0x00ff00)
            physicalUniforms.sheen.value = 1.0
            physicalUniforms.isRingActive = { value: this.osmUpdateStoreService.isOsmBuildingUpdateEnabled ? 1 : 0 }
            this.buildingMaterial = new ShaderMaterial({
                side: DoubleSide,
                fog: true,
                lights: true,
                vertexShader: PhysicalVertex,
                fragmentShader: PhysicalFragment,
                // wireframe: true,
                uniforms: physicalUniforms,
                // {
                //     ...UniformsUtils.merge([
                //         UniformsLib['common'],
                //         UniformsLib['fog'],
                //         UniformsLib['lights'],
                //         {
                //             diffuse: { value: new Color(0x00ff00) },
                //             opacity: { value: 1.0 },
                //         },
                //     ]),
                //     // fogColor: { value: (this.instance.scene.fog as Fog).color },
                //     // fogNear: { value: (this.instance.scene.fog as Fog).near },
                //     // fogFar: { value: (this.instance.scene.fog as Fog).far }
                // },
                defines: {
                    'STANDARD': '',
                    'PHYSICAL': '',
                    'USE_ENVMAP': '',
                    'ENVMAP_TYPE_CUBE_UV': '',
                    'USE_SHEEN': '',
                }
            })


            // this.buildingMaterial = new ShaderMaterial({

            //     glslVersion: GLSL3,
            //     side: DoubleSide,
            //     // fog: true,
            //     lights: true,
            //     vertexShader: vertexShader,
            //     fragmentShader: fragmentShader,
            //     // wireframe: true,
            //     uniforms: {
            //         ...UniformsUtils.merge([
            //             UniformsLib['common'],
            //             UniformsLib['fog'],
            //             UniformsLib['lights'],
            //             {
            //                 diffuse: { value: new Color(0x00ff00) },
            //                 opacity: { value: 1.0 },
            //             },
            //         ]),
            // "isRingActive": { value: this.osmUpdateStoreService.isOsmBuildingUpdateEnabled ? 1 : 0 },
            //         // fogColor: { value: (this.instance.scene.fog as Fog).color },
            //         // fogNear: { value: (this.instance.scene.fog as Fog).near },
            //         // fogFar: { value: (this.instance.scene.fog as Fog).far }
            //     },
            //     defines: {
            //         ENVMAP_TYPE_CUBE_UV: '',
            //         ENVMAP_MODE_REFLECTION: ''
            //     }
            // }
            // );
            buildingMaterial = this.buildingMaterial
        } else {
            buildingMaterial = this.buildingMaterial.clone()
        }

        this.csm.setupMaterial(buildingMaterial);
        if (!Boolean(buildingMaterial.uniforms.tMap)) {

            buildingMaterial.uniforms.tMap = {
                value: this.buildingTexture
            }
        }
        if (!Boolean(buildingMaterial.uniforms.tNoise)) {
            buildingMaterial.uniforms.tNoise = {
                value: this.noiseTexture
            }
        }

        if (!Boolean(buildingMaterial.uniforms.tSkyTexture)) {
            this.setBuildingMeshSkyTexture(buildingMaterial)
        }
        this.setBuildingMeshSunDirection(buildingMaterial)

        return buildingMaterial

    }

    setBuildingTexture(buildingTexture: DataArrayTexture, noiseTexture: Texture) {
        if (this.buildingTexture) {
            return
        }
        this.buildingTexture = buildingTexture
        this.noiseTexture = noiseTexture

    }

    getBuildingsTile(coordinate: Vector2): [boolean, BuildingsTile] {

        // const tilePosition = new Vector2(
        //     Math.ceil(coordinate.x - BUILDING_TILE_SIZE),
        //     Math.ceil(coordinate.y - BUILDING_TILE_SIZE)
        // )
        const scene = this.instance.scene

        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        const isTileAlreadyCreated = this._tileSets.has(tile_key)
        if (isTileAlreadyCreated) {
            return [true, this._tileSets.get(tile_key)]
        }

        const newBuildingTile = new BuildingsTile()
        newBuildingTile.key = tile_key
        newBuildingTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )
        // console.log(newBuildingTile.position)
        // newBuildingTile.updateMatrixWorld()
        // newBuildingTile.updateMatrix()

        this.buildingGroup.add(newBuildingTile)

        this._tileSets.set(tile_key, newBuildingTile)
        return [false, newBuildingTile]
    }

    updateBuildingVisibility(visibility: boolean) {
        this.buildingVisible = visibility
        this.buildingGroup.visible = visibility
        this.instance.notifyChange()
    }

    currentZoomChanged(zoom: number) {
        if (!this.buildingVisible) {
            return
        }
        if (zoom < 16 && this.buildingGroup.visible) {
            this.buildingGroup.visible = false
        } else if (zoom >= 16 && !this.buildingGroup.visible) {
            this.buildingGroup.visible = true
            this.instance.notifyChange()
        }
    }

    updateBuildingFeature(osmFeatureToChange: OsmFeatureToChange): SourceProperties {
        const properties = this.OSMIDProperites.get(osmFeatureToChange.osm_id)
        if (!properties) {
            return
        }
        for (const key in osmFeatureToChange.changes) {
            if (!properties.hasOwnProperty(key)) {
                continue
            }
            properties[key] = osmFeatureToChange.changes[key]
        }
        this.OSMIDProperites.set(osmFeatureToChange.osm_id, properties)

        return properties
    }
    loadTile(tile: RetrieveBuilding) {

        const x = tile.worldBuildingPosition[0]
        const y = tile.worldBuildingPosition[1]

        const [isTileAlreadyCreated, buildingTile] = this.getBuildingsTile(new Vector2(x, y))

        this.loadFeatureInScene(tile, buildingTile)


    }

    loadFeatures(tileResults: RetrieveBuilding[]) {
        for (let index = 0; index < tileResults.length; index++) {
            const tile = tileResults[index];
            const osmIDsSet = new Set<number>()
            for (let index = 0; index < tile.features.length; index++) {
                const feature = tile.features[index];
                this.OSMIDProperites.set(feature.properties.osm_id, feature.properties)
                osmIDsSet.add(feature.properties.osm_id)
            }
            this.tileOSMIDS.set(tile.tile_key, osmIDsSet)
            this.loadTileBuildingHeightIndex(tile)
            this.loadTile(tile)
            // console.log(tile.tile_key, "loading")
        }
    }

    loadTileBuildingHeightIndex(tileResult: RetrieveBuilding) {
        addTile(this.buildingHeightFlatBushIndex, { tileKey: tileResult.tile_key, buffer: tileResult.flatBushData });
        this.featuresStoreService.buildingHeightFlatBushIndex = this.buildingHeightFlatBushIndex

        const index = Flatbush.from(tileResult.flatBushData)
        this.tileExtents.set(tileResult.tile_key, tileResult.tileExtent)

        // this.buildingsIndex = new Flatbush(this.tileExtents.size)
        // for (const entry of this.tileExtents.entries()) {
        //     const tileIndex = this.buildingsIndex.add(entry[1][0], entry[1][1], entry[1][2], entry[1][3])
        //     this.tileKeyWithFlatBufferIndex.set(tileIndex, entry[0])
        // }
        // this.buildingsIndex.finish()
        this.featuresStoreService.addNewBuildingExtentLoaded(tileResult.tileExtent)
        this.tileFlatBush.set(tileResult.tile_key, index)
        this.tileFlatIndexBuildingHeight.set(tileResult.tile_key, tileResult.flatIndexBuildingHeight)
        this.tileFlatIndexBuildingOsmId.set(tileResult.tile_key, tileResult.flatIndexOsmId)
        this.featuresStoreService.tileFlatIndexBuildingHeight = this.tileFlatIndexBuildingHeight
        // Notify new building height loaded
        this.featuresStoreService.newBuildingHieghtLoaded = null
    }

    getTileKeyFromPosition(point: Vec2): string | undefined {
        const pointTileCoord = this.groundTileVectorSource.tileGrid.getTileCoordForCoordAndZ([point.x, point.y], 16)
        if (pointTileCoord) {
            return pointTileCoord[1] + "_" + pointTileCoord[2]
        }
    }

    getBuildingHeightAtPoint(point: Vec2) {
        if (this.tileFlatIndexBuildingHeight.size == 0) {
            return 20
        }
        const tile_key = this.getTileKeyFromPosition(point)
        if (Boolean(tile_key)) {
            const tileFlatBushIndex = this.tileFlatBush.get(tile_key)
            //  map (tileIndex, buildingHeight)
            const flatIndexOsmId = this.tileFlatIndexBuildingHeight.get(tile_key)
            if (tileFlatBushIndex && flatIndexOsmId) {
                // Recup de l'index du batiment dans le flatbush du tile
                const buildingIntersecting = tileFlatBushIndex.neighbors(point.x, point.y, 2)
                if (buildingIntersecting.length > 0) {

                    const buildingHeightAtPoint = Math.max(...buildingIntersecting.filter((index) => this.OSMIDProperites.has(flatIndexOsmId.get(index))).map((index) => this.OSMIDProperites.get(flatIndexOsmId.get(index)).buildingHeight));
                    if (buildingHeightAtPoint) {
                        return Math.max(buildingHeightAtPoint, 20)
                    }
                    // const buildingHeightAtPoint = this.TileBuildingHeightMap.get(tileIntersecting[0]).get(buildingIntersecting[0])
                }
            }
        }

        return 20
    }

    getFeatureFromOSMId(osm_id: number) {
        const properties = this.OSMIDProperites.get(osm_id)
        if (properties == undefined) {
            return
        }
        console.log(properties, properties["lcz_outline_id"])
        const feature = new Feature(new Polygon(properties.coordinates))
        feature.setProperties(properties)
        return feature

    }

    extentLoadEnd(vectorTileSource: VectorTileSource, tilesToLoad: Array<VectorRenderTile>, for_reload: boolean = false) {

        for (let index = 0; index < tilesToLoad.length; index++) {
            const tile = tilesToLoad[index];
            const tileCoord = tile.getTileCoord()
            const buildingTileCenter = getBottomLeft(vectorTileSource.tileGrid.getTileCoordExtent(tileCoord))
            const x = buildingTileCenter[0]
            const y = buildingTileCenter[1]

            const buildingsToHide = Array.from(this.featuresStoreService.getBuildingsToHide().entries()).filter((entry) => {
                return true
            }).map((entry) => {
                return entry[0]
            })
            let features = getFeaturesFromTileCoord(tile, 16)
            if (for_reload == true) {

                features = this.buildingVectorSource.getFeaturesInExtent(vectorTileSource.tileGrid.getTileCoordExtent(tileCoord))
            }

            features = features.filter(
                (feat) => ["bench", "construction", "streetLamp", "busStop"].indexOf(feat.getProperties()["type"]) == -1
            ).filter(
                (feat) => (!this.uniqueBuildingPerTile.has(feat.getProperties()["osm_id"]) || this.uniqueBuildingPerTile.get(feat.getProperties()["osm_id"]) == tileCoord)
            ).filter(
                (feat) => !buildingsToHide.includes(feat.getProperties()["osm_id"])
            )
            // .filter((feat) => feat.getProperties().osm_id === 69226554)


            if (features.length > 0) {
                if (!for_reload) {
                    features.forEach((feature) => {
                        // @ts-expect-error
                        feature.ol_uid = feature.getProperties()["osm_id"]
                    })
                    this.buildingVectorSource.addFeatures(features)
                    features.forEach((feature) => {
                        this.uniqueBuildingPerTile.set(feature.getProperties()["osm_id"], tileCoord)
                    })
                }



                const [isTileAlreadyCreated, buildingTile] = this.getBuildingsTile(new Vector2(x, y))


                const worldBuildingPosition = buildingTile.getWorldPosition(new Vector3())
                // this.addElevationAndSerializeFeatures(features, worldBuildingPosition, buildingTile.key)

            }
        }


        // this.rebuildBuildingsHeightIndex(vectorTileSource)

    }

    rebuildBuildingsHeightIndex() {
        // let t0 = performance.now()
        // const buildingsHeights = new Map()
        // const index = new Flatbush(this.OSMIDProperites.size);
        // index.data
        // for (const entry of this.OSMIDProperites.entries()) {
        //     const rectangleIndexPosition = index.add(entry[1].extent[0], entry[1].extent[1], entry[1].extent[2], entry[1].extent[3])

        //     buildingsHeights.set(rectangleIndexPosition, entry[1].buildingHeight)
        // }
        // index.finish()
        // this.buildingsHeights$.next(buildingsHeights)
        // this.buildingsIndex$.next(index)
        // let t1 = performance.now()
        // console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`);
        // console.log(buildingsHeights.size, "buildingsHeights");

        // if (buildingFeatures.length > 0) {

        //     const buildingsHeights = new Map()
        //     const index = new Flatbush(buildingFeatures.length);

        //     buildingFeatures.map((feature) => {
        //         const properties = feature.getProperties()
        //         const featureExtent = feature.getGeometry().getExtent()

        //         const rectangleIndexPosition = index.add(
        //             featureExtent[0],
        //             featureExtent[1],
        //             featureExtent[2],
        //             featureExtent[3],
        //         )
        //         buildingsHeights.set(rectangleIndexPosition, this.getBuildingParameters(properties)["height"] * 1.3)
        //     })
        //     index.finish()
        //     this.buildingsHeights$.next(buildingsHeights)
        //     this.buildingsIndex$.next(index)
        // }
    }




    loadFeatureInScene(tile: RetrieveBuilding, buildingTile: BuildingsTile) {


        const geometry = new BufferGeometry()

        tile.extrudeResult.geometryAttribute.forEach((geometryJson) => {
            geometry.setAttribute(geometryJson.key, new BufferAttribute(geometryJson.array, geometryJson.itemSize, geometryJson.normalized))
        })
        // const material = new MeshStandardMaterial({ side: DoubleSide, color: 0xffffff })


        const material = this.getBuildingMaterial()
        // this.csm.setupMaterial(material);
        // const material = new MeshLambertMaterial({ color: 0xffaa88 });
        // const material = new MeshNormalMaterial({ flatShading: false });
        // this.csm.setupMaterial(material);
        // this.instance.notifyChange()
        const building = new SelectableMesh(geometry, material)
        // const building = new Mesh(geometry, material)
        building.castShadow = true
        building.receiveShadow = true
        building.userData.name = BUILDING_DESCRIPTION_SHEET_TITLE
        building.userData.couche_id = LAYER_VECTOR_SOURCE_ID
        building.userData.descriptionSheetCapabilities = BUILDING_DESCRIPTION_SHEET
        building.userData.tileKey = tile.tile_key

        tmpBox3.setFromArray(tile.extrudeResult.boundingBoxMinMax)
        building.geometry.boundingBox = tmpBox3.clone()
        building.geometry.boundingSphere = tmpBox3.getBoundingSphere(tmpSphere).clone()
        building.frustumCulled = true
        // const mat = new MeshStandardMaterial({ color: new Color(0.5, 0, 0), side: DoubleSide });
        // this.csm.setupMaterial(mat);
        // const groupPlaneMesh = planeFromBox(tmpBox3, mat, { axis: 'z', where: 'center', margin: 0, segments: 1 })
        // groupPlaneMesh.receiveShadow = true
        // groupPlaneMesh.castShadow = true
        // groupPlaneMesh.updateMatrix()
        // groupPlaneMesh.updateMatrixWorld(true)
        // groupPlaneMesh.name = "building_group_plane"
        // getPlanesFromBoxSides(tmpBox3)

        // We have to keep uniforms of the old building mesh if exist
        if (buildingTile.children.length > 0) {
            console.log("tu fou quoi ici", buildingTile.children)
            // building.material.uniforms = (buildingTile.children[0] as SelectableMesh).material.uniforms
        }

        // var material1 = new MeshPhysicalMaterial({ color: '#08d9d6' });
        // this.csm.setupMaterial(material1);

        // var material2 = new MeshPhysicalMaterial({ color: '#ff2e63' });
        // this.csm.setupMaterial(material2);
        // var box_geometry = new BoxGeometry(10, 10, 10);
        // tmpBox3.getCenter(tempVec3)
        // tempVec3.copy(tmpBox3.min)

        // for (var i = 0; i < 10; i++) {

        //     var cube1 = new Mesh(box_geometry, i % 2 === 0 ? customMaterial : material2);
        //     cube1.castShadow = true;
        //     cube1.receiveShadow = true;
        //     cube1.rotateX(Math.PI / 2);
        //     buildingTile.add(cube1);


        //     cube1.position.set(tempVec3.x - i * 40, tempVec3.y + 10, tempVec3.z + 20);
        //     cube1.scale.y = Math.random() * 2 + 6;

        //     var cube2 = new Mesh(box_geometry, i % 2 === 0 ? material2 : customMaterial);
        //     cube2.castShadow = true;
        //     cube2.receiveShadow = true;
        //     cube2.rotateX(Math.PI / 2);
        //     buildingTile.add(cube2);
        //     cube2.position.set(tempVec3.x + i * 40, tempVec3.y - 10, tempVec3.z + 20);
        //     cube2.scale.y = Math.random() * 2 + 6;

        // }

        // buildingTile.clear()

        // const W = 1024, H = 512;
        // const offRT = new WebGLRenderTarget(W, H, { samples: 0 });
        // const composer = new EffectComposer(this.instance.renderer, offRT);
        // composer.addPass(new RenderPass(this.instance.scene, this.instance.view.camera));        // ta sous-scène
        // composer.addPass(new UnrealBloomPass(new Vector2(W, H), 1.2, 0.4, 0.85));
        // const mat = new MeshBasicMaterial({ map: composer.readBuffer.texture });
        // mat.toneMapped = false;

        buildingTile.add(building)
        // buildingTile.add(groupPlaneMesh)
        buildingTile.updateMatrixWorld()

        this.instance.notifyChange(buildingTile)
        // this.instance.notifyChange(this.instance.view.camera, {
        //     immediate: false,
        //     needsRedraw: true
        // })
    }




    getAndZoomToTheClosestBuilding(coordinate: Coordinate, osm_ids_to_exclude: number[]): { closestFeature: Feature<Geometry>, tileKey: string } {


        const [x, y] = coordinate
        const tileKey = this.getTileKeyFromPosition(new Vec2(x, y))
        if (tileKey) {
            // the tile key
            // recuperation du flatbush du tile et du map (tileIndex, buildingHeight)
            const tileFlatBushIndex = this.tileFlatBush.get(tileKey)
            //  map (tileIndex, buildingHeight)
            const flatIndexOsmId = this.tileFlatIndexBuildingOsmId.get(tileKey)
            if (tileFlatBushIndex && flatIndexOsmId) {
                // Recup de l'index du batiment dans le flatbush du tile
                const buildingIntersecting = tileFlatBushIndex.neighbors(x, y, 1, Infinity, (osm_id_index) => {

                    if (this.OSMIDProperites.has(flatIndexOsmId.get(osm_id_index))) {
                        const properties = this.OSMIDProperites.get(flatIndexOsmId.get(osm_id_index))
                        if (osm_ids_to_exclude.indexOf(properties.osm_id) == -1) {
                            return Boolean(properties.match_rnb_ids) == true && Boolean(properties.rnb) == false
                        }
                    }

                    return false
                })
                if (buildingIntersecting.length > 0) {
                    const properties = this.OSMIDProperites.get(flatIndexOsmId.get(buildingIntersecting[0]))
                    const closestFeature = new Feature(new Polygon(properties.coordinates))
                    closestFeature.setProperties(properties)
                    tempVec3.set(properties.center[0], properties.center[1], this.instance.view.camera.position.z)
                    const el = this.instance.renderer.domElement;
                    const pixelX = -el.clientWidth / 4;
                    // const box3 = new Box3(tempVec3, tempVec3)

                    // this.instance.view.goTo(this.instance.view.getDefaultPointOfView(box3))
                    new CartoHelper(this.map).panTo(tempVec3, pixelX)
                    return { closestFeature, tileKey }
                }

            }
        }


        return { closestFeature: null, tileKey: null }
    }




}


/**
 * Crée un Mesh (PlaneGeometry) aligné sur une face de la Box3.
 * @param {THREE.Box3} box
 * @param {Object} opt
 * @param {'x'|'y'|'z'} [opt.axis='z']   - normale du plan (x: plan YZ, y: plan XZ, z: plan XY)
 * @param {'center'|'min'|'max'} [opt.where='center'] - position: au centre de la box, sur la face min ou max le long de l’axe
 * @param {number} [opt.margin=0] - décalage supplémentaire le long de la normale
 * @param {number} [opt.segments=1] - segments du plan
 * @param {THREE.Material} [opt.material] - matériau optionnel
 * @returns {THREE.Mesh}
 */
function planeFromBox(box, mat: Material, { axis = 'y', where = 'center', margin = 0, segments = 1 }) {
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Dimensions du plan selon l’axe (normale)
    let width, height;
    if (axis === 'x') { width = size.z + 2 * margin; height = size.y + 2 * margin; } // plan YZ
    else if (axis === 'y') { width = size.x + 2 * margin; height = size.z + 2 * margin; } // plan XZ
    else { width = size.x + 2 * margin; height = size.y + 2 * margin; } // plan XY (+Z)

    const geom = new PlaneGeometry(width, height, segments, segments);

    // Orienter le plan : par défaut PlaneGeometry fait face à +Z
    const from = new Vector3(0, 0, 1);
    const to =
        axis === 'x' ? new Vector3(1, 0, 0) :
            axis === 'y' ? new Vector3(0, 1, 0) :
                new Vector3(0, 0, 1);
    const q = new Quaternion().setFromUnitVectors(from, to);
    geom.applyQuaternion(q);


    const mesh = new Mesh(geom, mat);

    // Positionner au centre / face min / face max le long de l’axe
    mesh.position.copy(center);
    if (where !== 'center') {
        const half = axis === 'x' ? size.x / 2 : axis === 'y' ? size.y / 2 : size.z / 2;
        const delta = (where === 'min' ? -half - margin : half + margin);
        if (axis === 'x') mesh.position.x += delta;
        if (axis === 'y') mesh.position.y += delta;
        if (axis === 'z') mesh.position.z += delta;
    }

    return mesh;
}
