import { ReplaySubject } from "rxjs/internal/ReplaySubject";
import { Instance, Map as Giro3DMap, VectorTileSource as GiroVectorTileSource, OLUtils, OrbitControls, tile, Coordinates, Extent, PoolWorker, ColorLayer, VectorSource, WorkerPool } from "../giro-3d-module";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { concatMap, debounceTime, delay, distinctUntilChanged, filter, last, map, mergeAll, retryWhen, map as rxjsMap, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, throttleTime, withLatestFrom } from "rxjs/operators"
import { Box3, Box3Helper, BoxGeometry, BoxHelper, ClampToEdgeWrapping, Color, DataArrayTexture, DirectionalLight, ImageLoader, Line, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, PerspectiveCamera, RedFormat, RepeatWrapping, RGBAFormat, RGBIntegerFormat, SRGBColorSpace, Texture, TextureLoader, TypedArray, UnsignedByteType, Vector2, Vector3 } from "three";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper } from "../../helper/carto.helper";
import { Projection, transform, transformExtent } from "ol/proj";
import { Feature, Fill, Geometry, getCenter, MVT, Stroke, Style, TileState, VectorTileSource, asColorLike } from "../ol-module";
import { environment } from "../../environments/environment";
import { TileCoord } from "ol/tilecoord";
import { BuildingLayer } from "./buildings";
import { TreeLayer } from "./trees";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { BehaviorSubject, combineLatest, forkJoin, from, interval, merge, Observable, of, Subject, zip, map as MapRxjs, asyncScheduler, defer, OperatorFunction } from "rxjs";
import { SkeletonBuilder } from 'straight-skeleton';
import VectorRenderTile from "ol/VectorRenderTile";
import CSM from 'three-csm';
import { ParametersService } from "../data/services/parameters.service";

import Vec2 from "./math/vector2";
import Vec3 from "./math/vector3";
import { AppInjector } from "../../helper/app-injector.helper";
import { HttpClient } from "@angular/common/http";
import { createTileStateJob, JobQueue } from "./job-queue";
import { getBottomLeft, getSize, Extent as OLExtent } from "ol/extent";
import { createListElevationWorker, getCapabilities } from "./elevation/pool";
import { createBuildingProcessingWorker, createExtrudeWorker } from "./building-processing-worker/pool";
import { StreamWorkerPool } from "./worker-pool";
import { WireExtruded } from "./building-processing-worker/worker-packer";
import { on } from "events";
import { RetrieveBuilding, RetrieveHugging, RetrievePoint, RetrieveProjected, SourceFeature, ZIndexMap } from "./building/type";
import { SunSystem } from "./sunSystem";
import { ProjectedLayer } from "./projected";
import { Tile3DInstanceType } from "./polygon/tile3d-projected-geometry-builder";
import { PointLayer } from "./pointLayer";
import { flipTriangleWindingNonIndexed } from "./build3dBuilding";
import { manageDataHelper } from "../../helper/manage-data.helper";
import { element } from "three/src/nodes/TSL";
import { ColorLike, PatternDescriptor } from "ol/colorlike";
import TileMesh from "@giro3d/cgiro3d/entities/tiles/TileMesh";
import { Tile, TileRange } from "ol";
import { BuildingProcessingMessageMap, buildingProcessingMessageType, RequestFeaturesProcessingInTile } from "./building-processing-worker/building.worker";
import WebGLImageSource from "./webglImageSource";



const _tempCameraVec3 = new Vector3()
const tempBox3 = new Box3()
const tempVec3 = new Vector3()
const temp2Vec3 = new Vector3()
const tempVec2 = new Vector2()
const textures = {
    "roofGeneric1Diffuse": { "url": "assets/textures/buildings/roofs/generic1_diffuse.png", "type": "image" },
    "roofGeneric1Normal": { "url": "assets/textures/buildings/roofs/generic1_normal.png", "type": "image" },
    "roofGeneric2Diffuse": { "url": "assets/textures/buildings/roofs/generic2_diffuse.png", "type": "image" },
    "roofGeneric2Normal": { "url": "assets/textures/buildings/roofs/generic2_normal.png", "type": "image" },

    "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_Color.jpg", "type": "image" },
    "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_NormalGL.png", "type": "image" },
    "roofGeneric3Mask": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_Roughness.png", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_Color.jpg", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_NormalGL.jpg", "type": "image" },
    // "roofGeneric3Mask": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_Roughness.jpg", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/grey_roof_01_diff_1k.jpg", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/generic3_diffuse.png", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/grey_roof_01_nor_dx_1k.jpg", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/generic3_normal.png", "type": "image" },
    "roofGeneric4Diffuse": { "url": "assets/textures/buildings/roofs/generic4_diffuse.png", "type": "image" },
    "roofGeneric4Normal": { "url": "assets/textures/buildings/roofs/generic4_normal.png", "type": "image" },

    "roofTilesDiffuse": { "url": "assets/textures/buildings/roofs/tiles_diffuse.png", "type": "image" },
    "roofTilesNormal": { "url": "assets/textures/buildings/roofs/tiles_normal.png", "type": "image" },
    "roofTilesMask": { "url": "assets/textures/buildings/roofs/tiles_mask.png", "type": "image" },

    "roofMetalDiffuse": { "url": "assets/textures/buildings/roofs/metal_diffuse.png", "type": "image" },
    "roofMetalNormal": { "url": "assets/textures/buildings/roofs/metal_normal.png", "type": "image" },
    "roofMetalMask": { "url": "assets/textures/buildings/roofs/metal_mask.png", "type": "image" },
    "roofConcreteDiffuse": { "url": "assets/textures/buildings/roofs/concrete_diffuse.png", "type": "image" },
    "roofConcreteNormal": { "url": "assets/textures/buildings/roofs/concrete_normal.png", "type": "image" },

    "roofConcreteMask": { "url": "assets/textures/buildings/roofs/concrete_mask.png", "type": "image" },
    "roofThatchDiffuse": { "url": "assets/textures/buildings/roofs/thatch_diffuse.png", "type": "image" },
    "roofThatchNormal": { "url": "assets/textures/buildings/roofs/thatch_normal.png", "type": "image" },
    "roofThatchMask": { "url": "assets/textures/buildings/roofs/thatch_mask.png", "type": "image" },

    "roofEternitDiffuse": { "url": "assets/textures/buildings/roofs/eternit_diffuse.png", "type": "image" },
    "roofEternitNormal": { "url": "assets/textures/buildings/roofs/eternit_normal.png", "type": "image" },
    "roofEternitMask": { "url": "assets/textures/buildings/roofs/eternit_mask.png", "type": "image" },
    "roofGrassDiffuse": { "url": "assets/textures/buildings/roofs/grass_diffuse.png", "type": "image" },

    "roofGrassNormal": { "url": "assets/textures/buildings/roofs/grass_normal.png", "type": "image" },
    "roofGrassMask": { "url": "assets/textures/buildings/roofs/grass_mask.png", "type": "image" },
    "roofGlassDiffuse": { "url": "assets/textures/buildings/roofs/glass_diffuse.png", "type": "image" },
    "roofGlassNormal": { "url": "assets/textures/buildings/roofs/glass_normal.png", "type": "image" },

    "roofGlassMask": { "url": "assets/textures/buildings/roofs/glass_mask.png", "type": "image" },
    "roofTarDiffuse": { "url": "assets/textures/buildings/roofs/tar_diffuse.png", "type": "image" },
    "roofTarNormal": { "url": "assets/textures/buildings/roofs/tar_normal.png", "type": "image" },
    "roofTarMask": { "url": "assets/textures/buildings/roofs/tar_mask.png", "type": "image" },

    "roofCommonMask": { "url": "assets/textures/buildings/roofs/grey_roof_01_arm_1k.jpg", "type": "image" },
    // "roofCommonMask": { "url": "assets/textures/buildings/roofs/common_mask.png", "type": "image" },
    "facadeGlassDiffuse": { "url": "assets/textures/buildings/facades/glass_diffuse.png", "type": "image" },
    "facadeGlassNormal": { "url": "assets/textures/buildings/facades/glass_normal.png", "type": "image" },
    "facadeGlassMask": { "url": "assets/textures/buildings/facades/glass_mask.png", "type": "image" },

    "facadeBrickWallDiffuse": { "url": "assets/textures/buildings/facades/brick_wall_diffuse.png", "type": "image" },
    "facadeBrickWallNormal": { "url": "assets/textures/buildings/facades/brick_wall_normal.png", "type": "image" },
    "facadeBrickWallMask": { "url": "assets/textures/buildings/facades/brick_wall_mask.png", "type": "image" },
    "facadeBrickWindowDiffuse": { "url": "assets/textures/buildings/facades/brick_window_diffuse.png", "type": "image" },


    "facadePlasterWallDiffuse": { "url": "assets/textures/buildings/facades/plastered_wall_02_diff_1k.jpg", "type": "image" },
    "facadePlasterWallNormal": { "url": "assets/textures/buildings/facades/plastered_wall_02_nor_gl_1k.jpg", "type": "image" },
    "facadePlasterWallMask": { "url": "assets/textures/buildings/facades/plastered_wall_02_arm_1k.png", "type": "image" },

    "facadeBrickWindowNormal": { "url": "assets/textures/buildings/facades/brick_window_normal.png", "type": "image" },
    "facadeBrickWindowMask": { "url": "assets/textures/buildings/facades/brick_window_mask.png", "type": "image" },
    // "facadePlasterWallDiffuse": { "url": "assets/textures/buildings/facades/plaster_wall_diffuse.png", "type": "image" },
    // "facadePlasterWallNormal": { "url": "assets/textures/buildings/facades/plaster_wall_normal.png", "type": "image" },
    // "facadePlasterWallMask": { "url": "assets/textures/buildings/facades/plaster_wall_mask.png", "type": "image" },


    "facadePlasterWindowDiffuse": { "url": "assets/textures/buildings/facades/plaster_window_diffuse.png", "type": "image" },
    "facadePlasterWindowNormal": { "url": "assets/textures/buildings/facades/plaster_window_normal.png", "type": "image" },
    "facadePlasterWindowMask": { "url": "assets/textures/buildings/facades/plaster_window_mask.png", "type": "image" },

    "facadeWoodWallDiffuse": { "url": "assets/textures/buildings/facades/wood_wall_diffuse.png", "type": "image" },
    "facadeWoodWallNormal": { "url": "assets/textures/buildings/facades/wood_wall_normal.png", "type": "image" },
    "facadeWoodWallMask": { "url": "assets/textures/buildings/facades/wood_wall_mask.png", "type": "image" },
    "facadeWoodWindowDiffuse": { "url": "assets/textures/buildings/facades/wood_window_diffuse.png", "type": "image" },

    "facadeWoodWindowNormal": { "url": "assets/textures/buildings/facades/wood_window_normal.png", "type": "image" },
    "facadeWoodWindowMask": { "url": "assets/textures/buildings/facades/wood_window_mask.png", "type": "image" },
    "facadeBlockWallDiffuse": { "url": "assets/textures/buildings/facades/block_wall_diffuse.png", "type": "image" },
    "facadeBlockWallNormal": { "url": "assets/textures/buildings/facades/block_wall_normal.png", "type": "image" },

    "facadeBlockWallMask": { "url": "assets/textures/buildings/facades/block_wall_mask.png", "type": "image" },
    "facadeBlockWindowDiffuse": { "url": "assets/textures/buildings/facades/block_window_diffuse.png", "type": "image" },
    "facadeBlockWindowNormal": { "url": "assets/textures/buildings/facades/block_window_normal.png", "type": "image" },
    "facadeBlockWindowMask": { "url": "assets/textures/buildings/facades/block_window_mask.png", "type": "image" },

    "window0Glow": { "url": "assets/textures/buildings/facades/window0_glow.png", "type": "image" },
    "window1Glow": { "url": "assets/textures/buildings/facades/window1_glow.png", "type": "image" },
    "glassGlow": { "url": "assets/textures/buildings/facades/glass_glow.png", "type": "image" },
    "noGlow": { "url": "assets/textures/buildings/facades/no_glow.png", "type": "image" },
}

const buildingTextures = [
    // textures['roofGeneric1Diffuse'],
    // textures['roofGeneric1Normal'],
    // textures['roofCommonMask'],
    // textures['noGlow'],

    // textures['roofGeneric2Diffuse'],
    // textures['roofGeneric2Normal'],
    // textures['roofCommonMask'],
    // textures['noGlow'],

    textures['roofGeneric3Diffuse'],
    textures['roofGeneric3Normal'],
    textures['roofGeneric3Mask'],
    textures['noGlow'],

    // textures['roofGeneric4Diffuse'],
    // textures['roofGeneric4Normal'],
    // textures['roofCommonMask'],
    // textures['noGlow'],

    textures['roofTilesDiffuse'],
    textures['roofTilesNormal'],
    textures['roofTilesMask'],
    textures['noGlow'],

    textures['roofMetalDiffuse'],
    textures['roofMetalNormal'],
    textures['roofMetalMask'],
    textures['noGlow'],

    textures['roofConcreteDiffuse'],
    textures['roofConcreteNormal'],
    textures['roofConcreteMask'],
    textures['noGlow'],

    textures['roofThatchDiffuse'],
    textures['roofThatchNormal'],
    textures['roofThatchMask'],
    textures['noGlow'],

    textures['roofEternitDiffuse'],
    textures['roofEternitNormal'],
    textures['roofEternitMask'],
    textures['noGlow'],

    textures['roofGrassDiffuse'],
    textures['roofGrassNormal'],
    textures['roofGrassMask'],
    textures['noGlow'],

    textures['roofGlassDiffuse'],
    textures['roofGlassNormal'],
    textures['roofGlassMask'],
    textures['noGlow'],

    textures['roofTarDiffuse'],
    textures['roofTarNormal'],
    textures['roofTarMask'],
    textures['noGlow'],

    textures['facadeGlassDiffuse'],
    textures['facadeGlassNormal'],
    textures['facadeGlassMask'],
    textures['glassGlow'],

    textures['facadeBrickWallDiffuse'],
    textures['facadeBrickWallNormal'],
    textures['facadeBrickWallMask'],
    textures['noGlow'],

    // textures['facadeBrickWindowDiffuse'],
    // textures['facadeBrickWindowNormal'],
    // textures['facadeBrickWindowMask'],
    // textures['window0Glow'],
    // 15
    textures['facadePlasterWallDiffuse'],
    textures['facadePlasterWallNormal'],
    textures['facadePlasterWallMask'],
    textures['noGlow'],

    // textures['facadePlasterWindowDiffuse'],
    // textures['facadePlasterWindowNormal'],
    // textures['facadePlasterWindowMask'],
    // textures['window1Glow'],

    textures['facadeWoodWallDiffuse'],
    textures['facadeWoodWallNormal'],
    textures['facadeWoodWallMask'],
    textures['noGlow'],

    // textures['facadeWoodWindowDiffuse'],
    // textures['facadeWoodWindowNormal'],
    // textures['facadeWoodWindowMask'],
    // textures['window0Glow'],

    textures['facadeBlockWallDiffuse'],
    textures['facadeBlockWallNormal'],
    textures['facadeBlockWallMask'],
    textures['window0Glow'],

    // textures['facadeBlockWindowDiffuse'],
    // textures['facadeBlockWindowNormal'],
    // textures['facadeBlockWindowMask'],
    // textures['window1Glow'],

]
const noiseTextureUrl = "assets/textures/noise/noise.png"

const projectedTexturesUrl = {
    "waterDiffuse": { "url": "assets/textures/surfaces/water_004_diff.jpg", "type": "image" },
    "waterNormal": { "url": "assets/textures/surfaces/water_004_normal.jpg", "type": "image" },
    "waterMask": { "url": "assets/textures/surfaces/water_004_mask.png", "type": "image" },

    // "waterDiffuse": { "url": "assets/textures/surfaces/water_003_diff.png", "type": "image" },
    // "waterNormal": { "url": "assets/textures/surfaces/water_003_normal.png", "type": "image" },
    // "waterMask": { "url": "assets/textures/surfaces/water_003_mask.png", "type": "image" },

    // "waterDiffuse": { "url": "assets/textures/surfaces/water_002_diff.jpg", "type": "image" },
    // "waterNormal": { "url": "assets/textures/surfaces/water_textures_2k_normal.png", "type": "image" },
    // "waterMask": { "url": "assets/textures/surfaces/water_002_roughness_displacement.png", "type": "image" },

    // "waterDiffuse": { "url": "assets/textures/surfaces/water_001_diff.jpg", "type": "image" },
    // "waterNormal": { "url": "assets/textures/surfaces/water_001_normal.jpg", "type": "image" },
    // "waterMask": { "url": "assets/textures/surfaces/water_001_roughness_displacement.png", "type": "image" },

    "pavementDiffuse": { "url": "assets/textures/surfaces/pavement_diffuse.png", "type": "image" },

    "asphaltDiffuse": { "url": "assets/textures/surfaces/asphalt.jpg", "type": "image" },
    // "asphaltDiffuse": { "url": "assets/textures/surfaces/asphalt_diffuse.png", "type": "image" },

    "asphaltNormal": { "url": "assets/textures/surfaces/asphalt_normal.png", "type": "image" },
    "cyclewayDiffuse": { "url": "assets/textures/surfaces/cycleway_diffuse.png", "type": "image" },
    "cobblestoneDiffuse": { "url": "assets/textures/surfaces/cobblestone_diffuse.png", "type": "image" },
    "cobblestoneNormal": { "url": "assets/textures/surfaces/cobblestone_normal.png", "type": "image" },
    "commonNormal": { "url": "assets/textures/surfaces/common_normal.png", "type": "image" },
    "commonMask": { "url": "assets/textures/surfaces/common_mask.png", "type": "image" },
    "footballPitchDiffuse": { "url": "assets/textures/surfaces/football_pitch_diffuse.png", "type": "image" },
    "basketballPitchDiffuse": { "url": "assets/textures/surfaces/basketball_pitch_diffuse.png", "type": "image" },
    "basketballPitchNormal": { "url": "assets/textures/surfaces/basketball_pitch_normal.png", "type": "image" },
    "tennisPitchDiffuse": { "url": "assets/textures/surfaces/tennis_pitch_diffuse.png", "type": "image" },
    "tennisPitchNormal": { "url": "assets/textures/surfaces/tennis_pitch_diffuse.png", "type": "image" },
    "manicuredGrassDiffuse": { "url": "assets/textures/surfaces/manicured_grass_diffuse.png", "type": "image" },
    "railwayDiffuse": { "url": "assets/textures/surfaces/railway_diffuse.png", "type": "image" },
    "railwayNormal": { "url": "assets/textures/surfaces/railway_normal.png", "type": "image" },
    "railwayMask": { "url": "assets/textures/surfaces/railway_mask.png", "type": "image" },
    "railwayTopDiffuse": { "url": "assets/textures/surfaces/railway_top_diffuse.png", "type": "image" },
    "railDiffuse": { "url": "assets/textures/surfaces/rail_diffuse.png", "type": "image" },
    "rockDiffuse": { "url": "assets/textures/surfaces/rock_diffuse.png", "type": "image" },
    "rockNormal": { "url": "assets/textures/surfaces/rock_normal.png", "type": "image" },
    "rockMask": { "url": "assets/textures/surfaces/rock_mask.png", "type": "image" },
    "sandDiffuse": { "url": "assets/textures/surfaces/sand_diffuse.png", "type": "image" },
    "sandNormal": { "url": "assets/textures/surfaces/sand_normal.png", "type": "image" },
    "sandMask": { "url": "assets/textures/surfaces/sand_mask.png", "type": "image" },
    "hedgeDiffuse": { "url": "assets/textures/surfaces/hedge_diffuse.png", "type": "image" },
    "hedgeNormal": { "url": "assets/textures/surfaces/hedge_normal.png", "type": "image" },
    "hedgeMask": { "url": "assets/textures/surfaces/hedge_mask.png", "type": "image" },
    "woodFenceDiffuse": { "url": "assets/textures/surfaces/wood_fence_diffuse.png", "type": "image" },
    "woodFenceNormal": { "url": "assets/textures/surfaces/wood_fence_normal.png", "type": "image" },
    "woodFenceMask": { "url": "assets/textures/surfaces/wood_fence_mask.png", "type": "image" },
    "concreteFenceDiffuse": { "url": "assets/textures/surfaces/concrete_fence_diffuse.png", "type": "image" },
    "concreteFenceNormal": { "url": "assets/textures/surfaces/concrete_fence_normal.png", "type": "image" },
    "concreteFenceMask": { "url": "assets/textures/surfaces/concrete_fence_mask.png", "type": "image" },
    "asphaltRoadDiffuse": { "url": "assets/textures/surfaces/asphalt_road_diffuse.png", "type": "image" },
    "asphaltUnmarkedRoadDiffuse": { "url": "assets/textures/surfaces/asphalt_unmarked_road_diffuse.png", "type": "image" },
    "concreteRoadDiffuse": { "url": "assets/textures/surfaces/concrete_road_diffuse.png", "type": "image" },
    "concreteUnmarkedRoadDiffuse": { "url": "assets/textures/surfaces/concrete_unmarked_road_diffuse.png", "type": "image" },
    "concreteIntersectionDiffuse": { "url": "assets/textures/surfaces/concrete_intersection_diffuse.png", "type": "image" },
    "woodRoadDiffuse": { "url": "assets/textures/surfaces/wood_road_diffuse.png", "type": "image" },
    "woodRoadNormal": { "url": "assets/textures/surfaces/wood_road_normal.png", "type": "image" },
    "woodRoadMask": { "url": "assets/textures/surfaces/wood_road_mask.png", "type": "image" },
    "helipadDiffuse": { "url": "assets/textures/surfaces/helipad_diffuse.png", "type": "image" },
    "helipadNormal": { "url": "assets/textures/surfaces/common_normal.png", "type": "image" },
    "gardenDiffuse": { "url": "assets/textures/surfaces/garden_diffuse.png", "type": "image" },
    "gardenNormal": { "url": "assets/textures/surfaces/garden_normal.png", "type": "image" },
    "soilDiffuse": { "url": "assets/textures/surfaces/soil_diffuse.png", "type": "image" },
    "soilNormal": { "url": "assets/textures/surfaces/soil_normal.png", "type": "image" },
    "soilMask": { "url": "assets/textures/surfaces/soil_mask.png", "type": "image" },

    "grassDiffuse": { "url": "assets/textures/surfaces/grass.jpg", "type": "image" },
    // "grassDiffuse": { "url": "assets/textures/surfaces/grass_diffuse.png", "type": "image" },

    "grassNormal": { "url": "assets/textures/surfaces/grass_normal.png", "type": "image" },
    "forestFloorDiffuse": { "url": "assets/textures/surfaces/forest_floor_diffuse.png", "type": "image" },
    "forestFloorNormal": { "url": "assets/textures/surfaces/forest_floor_normal.png", "type": "image" },
    "forestFloorMask": { "url": "assets/textures/surfaces/forest_floor_mask.png", "type": "image" },
    "chainLinkFenceDiffuse": { "url": "assets/textures/surfaces/chainlink_fence_diffuse.png", "type": "image" },
    "chainLinkFenceNormal": { "url": "assets/textures/surfaces/chainlink_fence_normal.png", "type": "image" },
    "chainLinkFenceMask": { "url": "assets/textures/surfaces/chainlink_fence_mask.png", "type": "image" },
    "metalFenceDiffuse": { "url": "assets/textures/surfaces/metal_fence_diffuse.png", "type": "image" },
    "metalFenceNormal": { "url": "assets/textures/surfaces/metal_fence_normal.png", "type": "image" },
    "metalFenceMask": { "url": "assets/textures/surfaces/metal_fence_mask.png", "type": "image" },
    "stoneWallDiffuse": { "url": "assets/textures/surfaces/stone_wall_diffuse.png", "type": "image" },
    "stoneWallNormal": { "url": "assets/textures/surfaces/stone_wall_normal.png", "type": "image" },
    "stoneWallMask": { "url": "assets/textures/surfaces/stone_wall_mask.png", "type": "image" },
    "concreteWallDiffuse": { "url": "assets/textures/surfaces/concrete_wall_diffuse.png", "type": "image" },
    "concreteWallNormal": { "url": "assets/textures/surfaces/concrete_wall_normal.png", "type": "image" },
    "concreteWallMask": { "url": "assets/textures/surfaces/concrete_wall_mask.png", "type": "image" },
    "farmland0Diffuse": { "url": "assets/textures/surfaces/farmland0_diffuse.png", "type": "image" },
    "farmland0Normal": { "url": "assets/textures/surfaces/farmland0_normal.png", "type": "image" },
    "farmlandMask": { "url": "assets/textures/surfaces/farmland_mask.png", "type": "image" },
    "farmland1Diffuse": { "url": "assets/textures/surfaces/farmland1_diffuse.png", "type": "image" },
    "farmland1Normal": { "url": "assets/textures/surfaces/farmland1_normal.png", "type": "image" },
    "farmland2Diffuse": { "url": "assets/textures/surfaces/farmland2_diffuse.png", "type": "image" },
    "farmland2Normal": { "url": "assets/textures/surfaces/farmland2_normal.png", "type": "image" },
    "gravelDiffuse": { "url": "assets/textures/surfaces/gravel_diffuse.png", "type": "image" },
    "gravelNormal": { "url": "assets/textures/surfaces/gravel_normal.png", "type": "image" },
    "gravelMask": { "url": "assets/textures/surfaces/gravel_mask.png", "type": "image" },
    "dirtRoadDiffuse": { "url": "assets/textures/surfaces/dirt_road_diffuse.png", "type": "image" },
    "dirtRoadNormal": { "url": "assets/textures/surfaces/dirt_road_normal.png", "type": "image" },
    "dirtRoadMask": { "url": "assets/textures/surfaces/dirt_road_mask.png", "type": "image" },
    "sandRoadDiffuse": { "url": "assets/textures/surfaces/sand_road_diffuse.png", "type": "image" },
    "sandRoadNormal": { "url": "assets/textures/surfaces/sand_road_normal.png", "type": "image" },
    "sandRoadMask": { "url": "assets/textures/surfaces/sand_road_mask.png", "type": "image" },
    "pitchGenericDiffuse": { "url": "assets/textures/surfaces/pitch_generic_diffuse.png", "type": "image" },
    "pitchGenericNormal": { "url": "assets/textures/surfaces/pitch_generic_normal.png", "type": "image" },
    "sandySoilDiffuse": { "url": "assets/textures/surfaces/sandy_soil_diffuse.png", "type": "image" },
    "sandySoilHeight": { "url": "assets/textures/surfaces/sandy_soil_height.png", "type": "image" },

}

const projectedTextures = [
    projectedTexturesUrl["waterDiffuse"],
    projectedTexturesUrl["waterNormal"],
    projectedTexturesUrl["waterMask"],

    projectedTexturesUrl['pavementDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['asphaltDiffuse'],
    projectedTexturesUrl['asphaltNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['cobblestoneDiffuse'],
    projectedTexturesUrl['cobblestoneNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['footballPitchDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['basketballPitchDiffuse'],
    projectedTexturesUrl['basketballPitchNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['tennisPitchDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['manicuredGrassDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['cyclewayDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['railwayDiffuse'],
    projectedTexturesUrl['railwayNormal'],
    projectedTexturesUrl['railwayMask'],

    projectedTexturesUrl['rockDiffuse'],
    projectedTexturesUrl['rockNormal'],
    projectedTexturesUrl['rockMask'],

    projectedTexturesUrl['sandDiffuse'],
    projectedTexturesUrl['sandNormal'],
    projectedTexturesUrl['sandMask'],
    //10 up
    projectedTexturesUrl['hedgeDiffuse'],
    projectedTexturesUrl['hedgeNormal'],
    projectedTexturesUrl['hedgeMask'],

    projectedTexturesUrl['woodFenceDiffuse'],
    projectedTexturesUrl['woodFenceNormal'],
    projectedTexturesUrl['woodFenceMask'],

    projectedTexturesUrl['concreteFenceDiffuse'],
    projectedTexturesUrl['concreteFenceNormal'],
    projectedTexturesUrl['concreteFenceMask'],

    projectedTexturesUrl['asphaltRoadDiffuse'],
    projectedTexturesUrl['asphaltNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['asphaltUnmarkedRoadDiffuse'],
    projectedTexturesUrl['asphaltNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['concreteRoadDiffuse'],
    projectedTexturesUrl['asphaltNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['concreteUnmarkedRoadDiffuse'],
    projectedTexturesUrl['asphaltNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['concreteIntersectionDiffuse'],
    projectedTexturesUrl['commonNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['woodRoadDiffuse'],
    projectedTexturesUrl['woodRoadNormal'],
    projectedTexturesUrl['woodRoadMask'],
    //20 up

    projectedTexturesUrl['helipadDiffuse'],
    projectedTexturesUrl['helipadNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['gardenDiffuse'],
    projectedTexturesUrl['gardenNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['soilDiffuse'],
    projectedTexturesUrl['soilNormal'],
    projectedTexturesUrl['soilMask'],

    projectedTexturesUrl['grassDiffuse'],
    projectedTexturesUrl['grassNormal'],
    projectedTexturesUrl['commonMask'],

    projectedTexturesUrl['forestFloorDiffuse'],
    projectedTexturesUrl['forestFloorNormal'],
    projectedTexturesUrl['forestFloorMask'],

    projectedTexturesUrl['chainLinkFenceDiffuse'],
    projectedTexturesUrl['chainLinkFenceNormal'],
    projectedTexturesUrl['chainLinkFenceMask'],

    projectedTexturesUrl['metalFenceDiffuse'],
    projectedTexturesUrl['metalFenceNormal'],
    projectedTexturesUrl['metalFenceMask'],

    projectedTexturesUrl['stoneWallDiffuse'],
    projectedTexturesUrl['stoneWallNormal'],
    projectedTexturesUrl['stoneWallMask'],

    projectedTexturesUrl['concreteWallDiffuse'],
    projectedTexturesUrl['concreteWallNormal'],
    projectedTexturesUrl['concreteWallMask'],

    projectedTexturesUrl['farmland0Diffuse'],
    projectedTexturesUrl['farmland0Normal'],
    projectedTexturesUrl['farmlandMask'],
    //30 up

    projectedTexturesUrl['farmland1Diffuse'],
    projectedTexturesUrl['farmland1Normal'],
    projectedTexturesUrl['farmlandMask'],

    projectedTexturesUrl['farmland2Diffuse'],
    projectedTexturesUrl['farmland2Normal'],
    projectedTexturesUrl['farmlandMask'],

    projectedTexturesUrl['gravelDiffuse'],
    projectedTexturesUrl['gravelNormal'],
    projectedTexturesUrl['gravelMask'],

    projectedTexturesUrl['dirtRoadDiffuse'],
    projectedTexturesUrl['dirtRoadNormal'],
    projectedTexturesUrl['dirtRoadMask'],

    projectedTexturesUrl['sandRoadDiffuse'],
    projectedTexturesUrl['sandRoadNormal'],
    projectedTexturesUrl['sandRoadMask'],

    projectedTexturesUrl['railwayTopDiffuse'],
    projectedTexturesUrl['railwayNormal'],
    projectedTexturesUrl['railwayMask'],

    projectedTexturesUrl['railDiffuse'],
    projectedTexturesUrl['railwayNormal'],
    projectedTexturesUrl['railwayMask'],

    projectedTexturesUrl['pitchGenericDiffuse'],
    projectedTexturesUrl['pitchGenericNormal'],
    projectedTexturesUrl['commonMask'],
]


const threeVolumeTexturesUrl = "assets/textures/models/tree/tree_volume_normal.png"

const pointTexturesUrl = {
    "treeOakDiffuse": { "url": "assets/textures/models/tree/linden0_diffuse.png", "type": "image" },
    "treeOakNormal": { "url": "assets/textures/models/tree/linden0_normal.png", "type": "image" },

    "adColumnDiffuse": { "url": "assets/textures/models/ad_column/diffuse.png", "type": "image" },
    "adColumnNormal": { "url": "assets/textures/models/ad_column/normal.png", "type": "image" },


    "transmissionTowerDiffuse": { "url": "assets/textures/models/transmission_tower/diffuse.png", "type": "image" },
    "transmissionTowerNormal": { "url": "assets/textures/models/transmission_tower/normal.png", "type": "image" },


    "hydrantDiffuse": { "url": "assets/textures/models/hydrant/diffuse.png", "type": "image" },
    "hydrantNormal": { "url": "assets/textures/models/hydrant/normal.png", "type": "image" },


    "trackedCraneDiffuse": { "url": "assets/textures/models/tracked_crane/diffuse.png", "type": "image" },
    "trackedCraneNormal": { "url": "assets/textures/models/tracked_crane/normal.png", "type": "image" },


    "towerCraneDiffuse": { "url": "assets/textures/models/tower_crane/diffuse.png", "type": "image" },
    "towerCraneNormal": { "url": "assets/textures/models/tower_crane/normal.png", "type": "image" },


    "benchDiffuse": { "url": "assets/textures/models/bench/diffuse.png", "type": "image" },
    "benchNormal": { "url": "assets/textures/models/bench/normal.png", "type": "image" },


    "picnicTableDiffuse": { "url": "assets/textures/models/picnic_table/diffuse.png", "type": "image" },
    "picnicTableNormal": { "url": "assets/textures/models/picnic_table/normal.png", "type": "image" },


    "busStopDiffuse": { "url": "assets/textures/models/bus_stop/diffuse.png", "type": "image" },
    "busStopNormal": { "url": "assets/textures/models/bus_stop/normal.png", "type": "image" },


    "windTurbineDiffuse": { "url": "assets/textures/models/wind_turbine/diffuse.png", "type": "image" },
    "windTurbineNormal": { "url": "assets/textures/models/wind_turbine/normal.png", "type": "image" },


    "memorialDiffuse": { "url": "assets/textures/models/memorial/diffuse.png", "type": "image" },
    "memorialNormal": { "url": "assets/textures/models/memorial/normal.png", "type": "image" },


    "statue0Diffuse": { "url": "assets/textures/models/statue_0/diffuse.png", "type": "image" },
    "statue0Normal": { "url": "assets/textures/models/statue_0/normal.png", "type": "image" },


    "statue1Diffuse": { "url": "assets/textures/models/statue_1/diffuse.png", "type": "image" },
    "statue1Normal": { "url": "assets/textures/models/statue_1/normal.png", "type": "image" },


    "sculptureDiffuse": { "url": "assets/textures/models/sculpture/diffuse.png", "type": "image" },
    "sculptureNormal": { "url": "assets/textures/models/sculpture/normal.png", "type": "image" },


    "shrubberyDiffuse": { "url": "assets/textures/models/shrubbery/diffuse.png", "type": "image" },
    "shrubberyNormal": { "url": "assets/textures/models/shrubbery/normal.png", "type": "image" },


    "utilityPoleDiffuse": { "url": "assets/textures/models/utility_pole/diffuse.png", "type": "image" },
    "utilityPoleNormal": { "url": "assets/textures/models/utility_pole/normal.png", "type": "image" },


    "wireDiffuse": { "url": "assets/textures/models/wire/diffuse.png", "type": "image" },
    "wireNormal": { "url": "assets/textures/models/wire/normal.png", "type": "image" },

    "streetLamp2LampDiffuse": { "url": "assets/textures/models/streetLamp2Lamp/diffuse.png", "type": "image" },
    "streetLamp2LampNormal": { "url": "assets/textures/models/streetLamp2Lamp/normal.png", "type": "image" },

    "streetLampBentMastDiffuse": { "url": "assets/textures/models/streetLampBentMast/diffuse.png", "type": "image" },
    "streetLampBentMastNormal": { "url": "assets/textures/models/streetLampBentMast/normal.png", "type": "image" },

    "streetLampPoleDiffuse": { "url": "assets/textures/models/streetLampPole/diffuse.png", "type": "image" },
    "streetLampPoleNormal": { "url": "assets/textures/models/streetLampPole/normal.png", "type": "image" },

    "streetLampStraightMastDiffuse": { "url": "assets/textures/models/streetLampStraightMast/diffuse.png", "type": "image" },
    "streetLampStraightMastNormal": { "url": "assets/textures/models/streetLampStraightMast/normal.png", "type": "image" }
};



const pointTextures = [

    pointTexturesUrl['treeOakDiffuse'],
    pointTexturesUrl['treeOakNormal'],


    pointTexturesUrl['adColumnDiffuse'],
    pointTexturesUrl['adColumnNormal'],

    pointTexturesUrl['transmissionTowerDiffuse'],
    pointTexturesUrl['transmissionTowerNormal'],

    pointTexturesUrl['hydrantDiffuse'],
    pointTexturesUrl['hydrantNormal'],

    pointTexturesUrl['trackedCraneDiffuse'],
    pointTexturesUrl['trackedCraneNormal'],

    pointTexturesUrl['towerCraneDiffuse'],
    pointTexturesUrl['towerCraneNormal'],

    pointTexturesUrl['benchDiffuse'],
    pointTexturesUrl['benchNormal'],

    pointTexturesUrl['picnicTableDiffuse'],
    pointTexturesUrl['picnicTableNormal'],

    pointTexturesUrl['busStopDiffuse'],
    pointTexturesUrl['busStopNormal'],

    pointTexturesUrl['windTurbineDiffuse'],
    pointTexturesUrl['windTurbineNormal'],

    pointTexturesUrl['memorialDiffuse'],
    pointTexturesUrl['memorialNormal'],

    pointTexturesUrl['statue0Diffuse'],
    pointTexturesUrl['statue0Normal'],

    pointTexturesUrl['shrubberyDiffuse'],
    pointTexturesUrl['shrubberyNormal'],

    pointTexturesUrl['utilityPoleDiffuse'],
    pointTexturesUrl['utilityPoleNormal'],

    pointTexturesUrl['wireDiffuse'],
    pointTexturesUrl['wireNormal'],

    pointTexturesUrl['statue1Diffuse'],
    pointTexturesUrl['statue1Normal'],

    pointTexturesUrl['sculptureDiffuse'],
    pointTexturesUrl['sculptureNormal'],

    pointTexturesUrl['streetLamp2LampDiffuse'],
    pointTexturesUrl['streetLamp2LampNormal'],

    pointTexturesUrl['streetLampBentMastDiffuse'],
    pointTexturesUrl['streetLampBentMastNormal'],

    pointTexturesUrl['streetLampPoleDiffuse'],
    pointTexturesUrl['streetLampPoleNormal'],

    pointTexturesUrl['streetLampStraightMastDiffuse'],
    pointTexturesUrl['streetLampStraightMastNormal'],
]



const pointModels: Record<Tile3DInstanceType, { url: string, type: string }> = {
    "tree": { "url": "/assets/textures/models/tree/tree.glb", "type": "gltf" },
    "adColumn": { "url": "assets/textures/models/ad_column/ad_column.glb", "type": "gltf" },
    "transmissionTower": { "url": "assets/textures/models/transmission_tower/transmission_tower.glb", "type": "gltf" },

    "hydrant": { "url": "assets/textures/models/hydrant/hydrant.glb", "type": "gltf" },
    "trackedCrane": { "url": "assets/textures/models/tracked_crane/tracked_crane.glb", "type": "gltf" },
    "towerCrane": { "url": "assets/textures/models/tower_crane/tower_crane.glb", "type": "gltf" },
    "bench": { "url": "assets/textures/models/bench/bench.glb", "type": "gltf" },
    "picnicTable": { "url": "assets/textures/models/picnic_table/picnic_table.glb", "type": "gltf" },
    "busStop": { "url": "assets/textures/models/bus_stop/bus_stop.glb", "type": "gltf" },
    "windTurbine": { "url": "assets/textures/models/wind_turbine/wind_turbine.glb", "type": "gltf" },
    "memorial": { "url": "assets/textures/models/memorial/memorial.glb", "type": "gltf" },
    "statueSmall": { "url": "assets/textures/models/statue_0/the_thinker.glb", "type": "gltf" },
    "statueBig": { "url": "assets/textures/models/statue_1/kentaur.glb", "type": "gltf" },
    "sculpture": { "url": "assets/textures/models/sculpture/sculpture.glb", "type": "gltf" },
    "shrubbery": { "url": "assets/textures/models/shrubbery/shrubbery.glb", "type": "gltf" },
    "utilityPole": { "url": "assets/textures/models/utility_pole/utility_pole.glb", "type": "gltf" },
    "wire": { "url": "assets/textures/models/wire/wire.glb", "type": "gltf" },
    "streetLamp2Lamp": { "url": "assets/textures/models/streetLamp2Lamp/streetLamp2Lamp.glb", "type": "gltf" },
    "streetLampBentMast": { "url": "assets/textures/models/streetLampBentMast/streetLampBentMast.glb", "type": "gltf" },
    "streetLampPole": { "url": "assets/textures/models/streetLampPole/streetLampPole.glb", "type": "gltf" },
    "streetLampStraightMast": { "url": "assets/textures/models/streetLampStraightMast/streetLampStraightMast.glb", "type": "gltf" },
}


export class GroundTileProcessing {

    instance: Instance
    map: Giro3DMap
    controls: OrbitControls

    vectorTileSource = new VectorTileSource({
        projection: 'EPSG:3857',
        format: new MVT(),
        url: environment.building_tile,
        tileGrid: createXYZ({ tileSize: 512 })
    });

    pointLayer: PointLayer
    projectedLayer: ProjectedLayer
    buildingLayer: BuildingLayer
    projectedColorLayer: ColorLayer

    capabilities: any
    private tileStatus: Map<string, "complete" | "loading" | "error"> = new Map<string, "complete" | "loading" | "error">()
    // private loader: TextureLoader = new TextureLoader();
    private loader = new ImageLoader();
    csm: CSM
    parametersService: ParametersService
    sunSystem: SunSystem

    buildingProcessingWorker: WorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap>

    nextId = 1;
    pending = new Map<number, string>();   // jobId -> tileId "z/x/y"
    inflightByTile = new Map<string, number>(); // tileId -> jobId
    cachedTiles = new Map<string, string>();
    inflightByTileExtent = new Map<string, Extent>();
    failedTile = new Set<string>();

    requestTile: (b: Array<RequestFeaturesProcessingInTile>) => void

    constructor(
        map: Giro3DMap,
        parametersService: ParametersService,
        sunSystem: SunSystem,
        csm: CSM
    ) {
        this.sunSystem = sunSystem
        this.parametersService = parametersService

        this.buildingProcessingWorker = new WorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap>({ createWorker: createBuildingProcessingWorker });


        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls

        this.buildingLayer = new BuildingLayer(this.map, this.vectorTileSource, csm, this.sunSystem)
        this.projectedLayer = new ProjectedLayer(this.map, this.vectorTileSource, csm, this.sunSystem)
        this.pointLayer = new PointLayer(this.map, this.vectorTileSource, csm, this.sunSystem)



        const getCamPos = () => {
            this.instance.view.camera.getWorldPosition(_tempCameraVec3);
            return new Vec3(_tempCameraVec3.x, _tempCameraVec3.y, _tempCameraVec3.z);
        };







        const cameraPos$ = fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
            // filter(() => threeGlbLoaded),
            rxjsMap((ev) => {
                // const controlTarget = new Vec3(this.controls.target.x, this.controls.target.y, this.controls.target.z)
                return getCamPos()
            }),
            debounceTime(150),

        );

        let forceInit: Vec3 = getCamPos()
        forceInit.x = forceInit.x + 200



        // setTimeout(() => {
        // // @ts-expect-error
        // this.map._allTiles.forEach((tile: TileMesh) => {
        //     // 8293 5635 14 8295 5639 14 33179 22551 16 
        //     // || tile.coordinate.z == 16
        //     if (tile.coordinate.z == 14) {

        //         const range = this.vectorTileSource.tileGrid.getTileRangeForExtentAndZ(OLUtils.toOLExtent(tile.getExtent()), tile.coordinate.z)
        //         console.log(range)
        //     }
        // })

        // }, 10000);






    }

    init() {
        const elevationCapabilities$ = from(getCapabilities()).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const textures$ = this.loadBuildingTextures().pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const projectedTextures$ = this.loadProjectedTextures().pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const pointTextures$ = this.loadPointTextures().pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const pointModels$ = this.loadModels().pipe(shareReplay({ bufferSize: 1, refCount: true }));

        projectedTextures$.subscribe((texture) => {
            this.projectedLayer.setProjectedTexture(texture)
        })
        pointTextures$.subscribe((param) => {
            this.pointLayer.setPointTexture(param.pointTexture, param.threeVolumeTexture)
        })
        pointModels$.subscribe((models) => {
            this.pointLayer.setGeometries(models)
        })

        textures$.subscribe((texture) => {
            this.buildingLayer.setBuildingTexture(texture.buildingTexture, texture.noiseTexture)
        })
        elevationCapabilities$.subscribe((caps) => {
            this.capabilities = caps
        })

        return combineLatest([
            elevationCapabilities$,
            pointModels$,
            textures$,
            projectedTextures$
        ]).pipe(
            take(1),
            tap((a) => {
                console.log(2)
                this.loadTiles()
            })
        )

    }


    computeVisibleTiles(olExtent: Extent, z: number) {
        const tiles: Array<{ z: number; x: number; y: number }> = [];
        this.vectorTileSource.tileGrid.forEachTileCoord(olExtent as any, z, (tc) => {

            tiles.push({ z: tc[0], x: tc[1], y: tc[2] });
        });
        return tiles;
    }

    tilePriority(t: { z: number; x: number; y: number }, c: { x: number; y: number }) {
        const R = 6378137, n = 2 ** t.z;
        const fx = (t.x + 0.5) / n, fy = (t.y + 0.5) / n;
        const mx = (fx - 0.5) * 2 * Math.PI * R;
        const my = (0.5 - fy) * 2 * Math.PI * R;
        const dx = mx - c.x, dy = my - c.y;
        return dx * dx + dy * dy;
    }

    loadTiles() {

        const webglSource = new WebGLImageSource({
            projectedTexture: this.projectedLayer.projectedTexture,
            renderer: this.instance.renderer,
            capabilities: this.capabilities
        })

        this.projectedColorLayer = new ColorLayer({
            source: webglSource,
            preloadImages: false,
            extent: this.map.extent
        })
        this.map.addLayer(this.projectedColorLayer)


        setInterval(() => {

            const nextTiles = this.getNextTiles()
            if (nextTiles) {
                this.processTiles(nextTiles)
            }
        }, 150);
    }

    currentZoomChanged(z: number) {
        this.buildingLayer.currentZoomChanged(z)
        this.projectedLayer.currentZoomChanged(z)
        this.pointLayer.currentZoomChanged(z)

        if (z < 16 && this.projectedColorLayer.visible) {
            this.projectedColorLayer.visible = false
        } else if (z >= 16 && !this.projectedColorLayer.visible) {
            this.projectedColorLayer.visible = true
            this.instance.notifyChange()
        }
    }

    getCurrentZoom() {
        const camera = this.instance.view.camera as PerspectiveCamera
        const focalLength = camera.position.distanceTo(this.controls.target);
        const fov = camera.fov * (Math.PI / 180);
        const aspect = camera.aspect;

        const heightNear = 2 * Math.tan(fov / 2) * focalLength;
        const mapWith = heightNear * aspect;

        const tileGrid = this.vectorTileSource.tileGrid
        let target_resolution = mapWith / this.map["_instance"].domElement.width

        const z = Math.ceil(tileGrid.getZForResolution(
            target_resolution
        ));

        this.currentZoomChanged(z)

        return z
    }
    getNextTiles(): RequestFeaturesProcessingInTile[] {
        // const t0 = performance.now();
        const zForResolution = this.getCurrentZoom()

        if (zForResolution < 14) {
            return
        }
        const zooms = [14, 16]


        const tiles: RequestFeaturesProcessingInTile[] = []
        for (let i = 0; i < zooms.length; i++) {
            const zoom = zooms[i]

            const controlTarget = (this.instance.view.controls as OrbitControls).target
            const mapExtent = Extent.fromCenterAndSize("EPSG:3857", { x: controlTarget.x, y: controlTarget.y }, 10000, 10000)
            //@ts-expect-error
            const olExtent = OLUtils.toOLExtent(mapExtent) as Extent;

            const center3857 = { x: this.controls.target.x, y: this.controls.target.y }
            const visibleTiles = this.computeVisibleTiles(olExtent, zoom)

            let fresh = visibleTiles.filter(({ z, x, y }) => {
                const tileId = `${z}/${x}/${y}`;
                return !this.inflightByTile.has(tileId) && !this.cachedTiles.has(tileId);
            });

            if (fresh.length == 0) {
                // cameraLoading = 0
                continue
            }



            fresh.sort((a, b) => this.tilePriority(a, center3857) - this.tilePriority(b, center3857));


            const { z, x, y } = fresh[0];
            const tileSize = Math.min(...getSize(this.vectorTileSource.tileGrid.getTileCoordExtent([z, x, y])))
            const tileId = `${z}/${x}/${y}`;
            const id = this.nextId++
            const url = environment.building_tile + "/" + z + "/" + x + "/" + y + ".pbf"
            const tileExtent = this.vectorTileSource.tileGrid.getTileCoordExtent([z, x, y])
            const tileBottomLeft = getBottomLeft(this.vectorTileSource.tileGrid.getTileCoordExtent([z, x, y]))
            this.inflightByTile.set(tileId, id);
            this.pending.set(id, tileId);

            // console.log(getSize(this.vectorTileSource.tileGrid.getTileCoordExtent(this.vectorTileSource.tileGrid.getTileCoordForCoordAndZ([controlTarget.x, controlTarget.y], 18))), tileSize)
            tiles.push({
                id,
                x,
                y,
                z,
                tileExtent,
                url,
                extentBottomLeft: [tileBottomLeft[0], tileBottomLeft[1]],
                tileSize: tileSize / 1,
            })


        }
        // const t1 = performance.now();
        // if (t1 - t0 > 10) {

        //     console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`);
        // }
        return tiles

    }
    processTiles(tiles: RequestFeaturesProcessingInTile[]) {
        if (!Boolean(tiles) || tiles == undefined || tiles.length == 0) {
            return
        }



        const onTIleFailed = (id: number) => {
            // console.error("onTIleFailed", id)
            const tileId = this.pending.get(id);
            this.pending.delete(id);
            this.inflightByTile.delete(tileId);
            this.failedTile.add(tileId)
        }

        const onTileSucceed = (id: number) => {
            const tileId = this.pending.get(id);
            // console.log("onTileSucceed", tileId, this.pending.delete(id))
            this.pending.delete(id);
            this.inflightByTile.delete(tileId);
            this.cachedTiles.set(tileId, tileId);
        }


        const skirtOffset = this.parametersService.buildingSettings.skirtOffset
        const outlineHeight = this.parametersService.buildingSettings.outlineHeight

        const payload: BuildingProcessingMessageMap["buildingProcessing"]["payload"] = {
            type: 'fetch',
            tiles,
            segment: this.map.segments,
            capabilities: this.capabilities,
            skirtOffset: skirtOffset,
            outlineHeight: outlineHeight,
            lczZones: this.parametersService.lczZones,
            excludeLayers: ["polygons"]
        }
        // const e = await this.buildingProcessingWorker.queue("buildingProcessing", payload)
        this.buildingProcessingWorker.queue("buildingProcessing", payload).then((e) => {
            if (e.type == "no_data" || e.type == "error") {
                // if (e.result && e.result.id) {
                //     onTIleFailed(e.result.id)
                // }
                return
            }

            for (let i = 0; i < e.result.length; i++) {
                const tileResult = e.result[i];

                if (tileResult.building) {
                    this.buildingLayer.loadFeatures([tileResult.building]);
                }
                // if (tileResult.projected) {
                //     this.projectedLayer.loadFeatures(tileResult.projected);
                // }
                if (tileResult.point) {
                    this.pointLayer.loadFeatures([tileResult.point]);
                }
                if (tileResult.hugging) {
                    this.projectedLayer.loadFeatures([tileResult.hugging]);
                }
                onTileSucceed(tileResult.id as number)
            }



        }).catch((e) => {
            console.error(e)
        })


    }


    updateGroundTilesVisibility(visibility) {
        this.buildingLayer.updateBuildingVisibility(visibility)
    }



    loadBuildingTextures() {
        const textureSWidth = 512
        const textureSHeight = 512

        const depth = textureSWidth * textureSHeight * Object.keys(buildingTextures).length * 4;  // RGBA, 4 channels per pixel
        const textureData = new Uint8Array(depth);
        const loadTextures$: Array<Observable<ImageData>> = []

        for (let index = 0; index < buildingTextures.length; index++) {
            const element = buildingTextures[index];

            loadTextures$.push(
                of(element).pipe(
                    switchMap((element) => {
                        return from(this.loader.loadAsync(element.url)).pipe((map((image) => { return { image, index } })))
                    }),
                    map((parameter) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = textureSWidth;
                        canvas.height = textureSHeight;
                        const context = canvas.getContext('2d');
                        context.drawImage(parameter.image, 0, 0);
                        const imageData = context.getImageData(0, 0, textureSWidth, textureSHeight);

                        textureData.set(
                            imageData.data,
                            parameter.index * textureSWidth * textureSHeight * 4
                        );
                        return imageData
                    }),
                    last(), // load only once and replay the same last response
                )
            )

        }


        const loader = new TextureLoader()

        return combineLatest(loadTextures$).pipe(
            last(),// load only once and replay the same last response
            // withLatestFrom(...loadMaskTextures$),
            withLatestFrom(loader.loadAsync(noiseTextureUrl)),
            map(([_, noiseTexture]) => {
                const buildingTexture = new DataArrayTexture(textureData, textureSWidth, textureSHeight, buildingTextures.length);
                buildingTexture.format = RGBAFormat;
                // buildingTexture.internalFormat = "RGBA8"
                // buildingTexture.type = UnsignedByteType;
                buildingTexture.colorSpace = SRGBColorSpace;
                buildingTexture.generateMipmaps = true;
                buildingTexture.magFilter = LinearFilter;
                buildingTexture.minFilter = LinearMipmapLinearFilter;
                // buildingTexture.minFilter = LinearMipmapLinearFilter;
                buildingTexture.wrapS = RepeatWrapping
                buildingTexture.wrapT = RepeatWrapping
                // buildingTexture.flipY = true
                buildingTexture.needsUpdate = true;
                buildingTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();

                // const maskTexture = new DataArrayTexture(maskTextureData, textureSWidth, textureSHeight, buildingTextures.length / 4);
                // maskTexture.colorSpace = SRGBColorSpace;
                // // buildingTexture.format = RGBAFormat;
                // // buildingTexture.type = UnsignedByteType;
                // // maskTexture.generateMipmaps = true;
                // maskTexture.magFilter = LinearFilter;
                // maskTexture.minFilter = LinearFilter;
                // // maskTexture.minFilter = LinearMipmapLinearFilter;
                // maskTexture.wrapS = RepeatWrapping
                // maskTexture.wrapT = RepeatWrapping
                // // maskTexture.flipY = true
                // maskTexture.needsUpdate = true;
                // maskTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();


                noiseTexture.format = RGBAFormat;
                // noiseTexture.internalFormat = "RGBA8"
                noiseTexture.type = UnsignedByteType;
                noiseTexture.colorSpace = SRGBColorSpace;
                // noiseTexture.generateMipmaps = true;
                noiseTexture.magFilter = NearestFilter
                noiseTexture.wrapS = RepeatWrapping
                noiseTexture.wrapT = RepeatWrapping
                noiseTexture.minFilter = NearestFilter;
                // noiseTexture.flipY = true
                noiseTexture.needsUpdate = true;
                noiseTexture.anisotropy = 16;


                return { buildingTexture, noiseTexture }
            })
        )


    }

    loadProjectedTextures() {
        const textureSWidth = 512
        const textureSHeight = 512
        // const projectedTextures = [
        //     projectedTexturesUrl['cobblestoneDiffuse'],
        //     projectedTexturesUrl['cobblestoneNormal'],
        //     projectedTexturesUrl['commonMask'],

        //     projectedTexturesUrl['grassDiffuse'],
        //     projectedTexturesUrl['asphaltNormal'],
        //     projectedTexturesUrl['commonMask'],
        // ]
        const depth = textureSWidth * textureSHeight * projectedTextures.length * 4;  // RGBA, 4 channels per pixel
        const textureData = new Uint8Array(depth);
        const loadTextures$: Array<Observable<ImageData>> = []

        for (let index = 0; index < projectedTextures.length; index++) {
            const element = projectedTextures[index];

            loadTextures$.push(
                of(element).pipe(
                    switchMap((element) => {
                        return from(this.loader.loadAsync(element.url)).pipe((map((image) => { return { image, index } })))
                    }),
                    map((parameter) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = textureSWidth;
                        canvas.height = textureSHeight;
                        const context = canvas.getContext('2d');
                        context.drawImage(parameter.image, 0, 0);
                        const imageData = context.getImageData(0, 0, textureSWidth, textureSHeight);
                        textureData.set(
                            imageData.data,
                            parameter.index * textureSWidth * textureSHeight * 4
                        );
                        return imageData
                    }),
                    last(), // load only once and replay the same last response
                )
            )

        }


        const loader = new TextureLoader()

        return combineLatest(loadTextures$).pipe(
            last(),// load only once and replay the same last response
            // withLatestFrom(...loadMaskTextures$),
            // withLatestFrom(loader.loadAsync(noiseTextureUrl)),
            map(() => {
                const projectedTexture = new DataArrayTexture(textureData, textureSWidth, textureSHeight, projectedTextures.length);
                projectedTexture.format = RGBAFormat;
                // projectedTexture.internalFormat = "RGBA8"
                // projectedTexture.type = UnsignedByteType;
                projectedTexture.colorSpace = SRGBColorSpace;
                projectedTexture.generateMipmaps = true;
                projectedTexture.magFilter = LinearFilter;
                projectedTexture.minFilter = LinearMipmapLinearFilter;
                // projectedTexture.minFilter = LinearMipmapLinearFilter;
                projectedTexture.wrapS = RepeatWrapping
                projectedTexture.wrapT = RepeatWrapping
                // projectedTexture.flipY = true
                projectedTexture.needsUpdate = true;
                projectedTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();


                return projectedTexture
            })
        )


    }

    loadPointTextures() {
        const textureSWidth = 512
        const textureSHeight = 512

        const depth = textureSWidth * textureSHeight * pointTextures.length * 4;  // RGBA, 4 channels per pixel
        const textureData = new Uint8Array(depth);
        const loadTextures$: Array<Observable<ImageData>> = []

        for (let index = 0; index < pointTextures.length; index++) {
            const element = pointTextures[index];

            loadTextures$.push(
                of(element).pipe(
                    switchMap((element) => {
                        return from(this.loader.loadAsync(element.url)).pipe((map((image) => { return { image, index } })))
                    }),
                    map((parameter) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = textureSWidth;
                        canvas.height = textureSHeight;
                        const context = canvas.getContext('2d');
                        context.drawImage(parameter.image, 0, 0);
                        const imageData = context.getImageData(0, 0, textureSWidth, textureSHeight);
                        textureData.set(
                            imageData.data,
                            parameter.index * textureSWidth * textureSHeight * 4
                        );
                        return imageData
                    }),
                    last(), // load only once and replay the same last response
                )
            )

        }

        const loader = new TextureLoader()


        return combineLatest(loadTextures$).pipe(
            last(),
            withLatestFrom(loader.loadAsync(threeVolumeTexturesUrl)),
            map((parameter: [ImageData[], Texture]) => {
                const pointTexture = new DataArrayTexture(textureData, textureSWidth, textureSHeight, pointTextures.length);
                pointTexture.format = RGBAFormat;

                pointTexture.colorSpace = SRGBColorSpace;
                pointTexture.generateMipmaps = true;
                pointTexture.magFilter = LinearFilter;
                pointTexture.minFilter = LinearMipmapLinearFilter;
                pointTexture.wrapS = RepeatWrapping
                pointTexture.wrapT = RepeatWrapping
                pointTexture.needsUpdate = true;
                pointTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();

                return { pointTexture, threeVolumeTexture: parameter[1] }
            })
        )


    }

    loadModels() {
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('assets/draco/')

        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)

        const glbLoaders: Observable<{ name: Tile3DInstanceType, model: GLTF }>[] = []

        for (const key in pointModels) {
            const element = pointModels[key];
            glbLoaders.push(
                defer(() =>
                    new Observable<{ name: Tile3DInstanceType, model: GLTF }>((observer) => {
                        const loader = gltfLoader;
                        loader.load(
                            element.url,
                            (gltf) => { observer.next({ name: key as Tile3DInstanceType, model: gltf }); observer.complete(); },
                            undefined,
                            (err) => observer.error(err)
                        );
                    })
                )
            )
        }



        return combineLatest(glbLoaders).pipe(
            last(),
            map((glbLoaders) => {
                return glbLoaders.map((glbLoader) => {
                    const geometry = (glbLoader.model.scene.children[0].clone() as Mesh).geometry
                    if (glbLoader.name === 'streetLampBentMast') {
                        geometry.applyMatrix4((glbLoader.model.scene.children[0].clone() as Mesh).matrix)

                        // console.log((glbLoader.model.scene.children[0].clone() as Mesh).rotation.toArray())
                    }
                    geometry.rotateX(Math.PI / 2)
                    // if (['streetLampBentMast', 'streetLampStraightMast', 'streetLampPole', 'streetLamp2Lamp'].indexOf(glbLoader.name) == -1) {

                    //     geometry.rotateX(Math.PI / 2)
                    // } else {
                    //     geometry.rotateX(Math.PI)
                    // }

                    if (glbLoader.name == "tree") {
                        const normals = geometry.attributes.normal;
                        for (let i = 0; i < normals.count; i++) {
                            normals.setXYZ(i, 0, 0, 1);
                        }
                        normals.needsUpdate = true;
                        // delete geometry.attributes.normal
                        // geometry.computeVertexNormals()
                        // console.log(geometry)
                    } else {

                    }
                    return {
                        name: glbLoader.name,
                        geometry: geometry
                    }
                })
            })
        )



    }
}
