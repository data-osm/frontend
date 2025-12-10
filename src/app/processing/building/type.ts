
import { OMBBResult } from "./ombb-params";
import { Coordinate } from "ol/coordinate";
import { VectorAreaRing } from "./tile-3d-ring";

import Vec3 from "../math/vector3";
import { Extent } from "ol/extent";
import { FillStyle, StrokeStyle } from "../../giro-3d-module";
import { Skeleton } from "straight-skeleton";
import { ExtrudedTile, WireAttr } from "../building-processing-worker/worker-packer";
import { LineString, MultiLineString } from "ol/geom";
import { GeometryType } from "../elevation/pool";
import { Tile3DInstanceType } from "../polygon/tile3d-projected-geometry-builder";
import { instance } from "three/src/nodes/TSL";
import { LinesStringWithZ, MultiLineStringWithZ } from "../utils";

export type BaseOptions = {
    /**
     * The point of origin for relative coordinates.
     */
    origin?: Vec3;
    /**
     * Ignores the Z component of coordinates.
     */
    ignoreZ?: boolean;
};

export type PolygonOptions = BaseOptions & {
    fill?: FillStyle;
    stroke?: StrokeStyle;
    extrusionOffset?: number[] | number;
    elevation?: number[] | number;
};

export type BuildingRoofType = 'flat' | 'hipped' | 'gabled' | 'gambrel' | 'pyramidal' | 'onion' | 'dome' | 'round' |
    'skillion' | 'mansard' | 'quadrupleSaltbox' | 'saltbox';
export type BuildingRoofMaterial = 'default' | 'tiles' | 'metal' | 'concrete' | 'thatch' | 'eternit' | 'grass' | 'glass' |
    'tar';
export type BuildingRoofOrientation = 'along' | 'across';
export type BuildingFacadeMaterial = 'plaster' | 'brick' | 'wood' | 'glass' | 'cementBlock';

export interface BuildingProperties {
    "ombb00": number
    "ombb01": number
    "ombb10": number
    "ombb11": number
    "ombb20": number
    "ombb21": number
    "ombb30": number
    "ombb31": number
    building_type: string
    color: number
    default_roof: boolean
    height: number
    is_part: boolean
    levels: number
    material: string
    min_height: number
    min_level: number
    name: string
    osm_id: number
    osm_type: "way" | "relation"
    roof_color: string
    roof_direction: number
    roof_height: number
    roof_levels: number
    type: string
    windows: boolean
    // roo_angle?: number
    roof_orientation?: BuildingRoofOrientation
    roof_material?: BuildingRoofMaterial
    roof_type?: BuildingRoofType,
    rnb: string,
    diff_rnb: string,
    match_rnb_ids: string,
    match_rnb_score: number,
    match_rnb_diff: string
    parent_and_children?: string
    building: string
    elevation?: number;
    skeleton?: string
    lcz_outline_id?: number
    station_id?: number
}
export type TreeType = 'genericBroadleaved' | 'genericNeedleleaved' | 'beech' | 'fir' | 'linden' | 'oak';
export interface VectorAreaDescriptor {
    label?: string;
    type: 'building' | 'buildingPart' | 'asphalt' | 'roadwayIntersection' | 'pavement' | 'water' | 'farmland' |
    'grass' | 'sand' | 'rock' | 'pitch' | 'manicuredGrass' | 'helipad' | 'forest' | 'garden' | 'construction' |
    'buildingConstruction' | 'shrubbery' | 'roadwayArea' | 'park';
    intersectionMaterial?: 'asphalt' | 'concrete' | 'cobblestone';
    pitchType?: 'generic' | 'football' | 'basketball' | 'tennis' | 'soccer';
    surface?: 'asphalt' | 'concrete'
    treeType?: TreeType;
    buildingLevels?: number;
    buildingHeight?: number;
    buildingMinHeight?: number;
    buildingRoofHeight?: number;
    buildingRoofType?: BuildingRoofType;
    buildingRoofOrientation?: BuildingRoofOrientation;
    buildingRoofDirection?: number;
    buildingRoofAngle?: number;
    buildingFacadeMaterial?: BuildingFacadeMaterial;
    buildingFacadeColor?: number;
    buildingRoofMaterial?: BuildingRoofMaterial;
    buildingRoofColor?: number;
    buildingWindows?: boolean;
    buildingFoundation?: boolean;
    ombb?: OMBBResult;
    poi?: Vec3;
    rnb?: string
    match_rnb_ids?: string;
    building?: string
    is_part?: boolean
    skeleton?: Skeleton
    lcz_outline_id?: number
    station_id?: number
}

export interface SurfaceVectorAreaDescriptor {
    type: 'grass' | 'scrub' | 'water' | 'forest' | 'garden' | 'pitch' | 'track' | 'playground' | 'dogPark' | 'park' | 'swimmingPool' | 'parking' | 'bicycleParking' | 'asphalt'
    osm_id: number
    osm_type: string
    sport?: VectorAreaDescriptor["pitchType"]
    surface?: VectorAreaDescriptor["surface"]
    hoops?: number
    leafType?: string
    genus?: string
    name?: string,
}

export interface SurfaceVectorLineDescriptor {
    type: "fence" | "wall" | 'path'
    osm_id: number
    osm_type: string
    wall_type: 'stone' | 'concrete' | 'hedge'
    path_type: string
    fence_type?: 'wood' | 'chainLink' | 'metal' | 'concrete'
    surface?: string
    oneway?: boolean
    height?: number
    width?: number
    min_height?: number
    name: string
}

export interface VectorPolylineDescriptor {
    osm_id: number
    type: 'path' | 'fence' | 'wall' | 'powerLine' | 'waterway';
    pathType?: 'roadway' | 'footway' | 'cycleway' | 'railway' | 'tramway' | 'runway';
    wallType?: 'stone' | 'concrete' | 'hedge';
    pathMaterial?: 'asphalt' | 'concrete' | 'dirt' | 'sand' | 'gravel' | 'cobblestone' | 'wood';
    isRoadwayMarked?: boolean;
    fenceMaterial?: 'wood' | 'chainLink' | 'metal' | 'concrete';
    width?: number;
    height?: number;
    minHeight?: number;
    lanesForward?: number;
    lanesBackward?: number;
    side?: 'both' | 'left' | 'right';
}

export interface PointVectorDescriptor {
    type: VectorNodeDescriptor['type']
    osm_id: number
    osm_type: string
    elevation: number
    surface?: string
    height?: number
    min_height?: number
    name: string,
    leafType?: string
    genus?: string
    direction?: number;
    lamp_support?: string;
    light_count?: number;
    backrest?: boolean
    roads_orientation?: { "side": number, "angle": number }
}


export enum RoofType {
    Flat,
    Gabled,
    Gambrel,
    Hipped,
    Pyramidal,
    Onion,
    Dome,
    Round,
    Skillion,
    Mansard,
    QuadrupleSaltbox,
    Saltbox
}

export interface VectorNodeDescriptor {
    type?: 'tree' | 'rock' | 'trackedCrane' | 'towerCrane' | 'transmissionTower' | 'utilityPole' | 'artwork' | 'adColumn' | 'windTurbine' |
    'bench' | 'picnicTable' | 'shrubbery' | 'busStop' | 'memorial' | 'statue' | 'sculpture' | 'fireHydrant' | "streetLamp2Lamp" | "streetLampMultiLamp" | "streetLampBentMast" | "streetLampPole" | "streetLampStraightMast";
    treeType?: TreeType;
    direction?: number;
    height?: number;
    minHeight?: number;
}

export interface VectorNode {
    type: 'node';
    osmReference: number;
    descriptor: VectorNodeDescriptor;
    x: number;
    y: number;
    z?: number;
    rotation: number;
}

export interface VectorArea {
    type: 'area';
    osmReference: number;
    elevation: number;
    descriptor: VectorAreaDescriptor;
    rings: VectorAreaRing[];
    isBuildingPartInRelation?: boolean;
    // featureId: number
}

export interface SurfaceVectorArea {
    type: 'area';
    osmReference: number;
    descriptor: VectorAreaDescriptor;
    rings: VectorAreaRing[];
    isBuildingPartInRelation?: boolean;
    // featureId: number
}
export interface VectorPolyline {
    type: 'polyline';
    osmReference: number;
    descriptor: VectorPolylineDescriptor;
    nodes: VectorNode[];
}

export interface SourceProperties extends BuildingProperties {
    extent: Extent
    buildingHeight: number
    center: Coordinate
    tileKey: string //x + "_" + y
    // only polygon for known
    coordinates: Coordinate[][]
}

export interface SourceFeature {
    properties: SourceProperties,
    geometryType: GeometryType,
    ends: number[] | Array<Array<number>>,
    coordinates: any,
    flatCoordinates: Array<number>,
    center: Coordinate,
}

export interface SourceLineFeature {
    properties: SurfaceVectorLineDescriptor,
    geometryType: GeometryType,
    geometry: LinesStringWithZ | MultiLineStringWithZ
}

export interface SourcePointFeature {
    properties: PointVectorDescriptor,
    geometryType: GeometryType,
    ends: number[] | Array<Array<number>>,
    coordinates: any,
    flatCoordinates: Array<number>,
    center: Coordinate,
}

export interface RetrieveBuilding {
    type: "building",
    features: SourceFeature[],
    z: number,
    x: number,
    y: number,
    // id: number
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    flatBushData: ArrayBuffer,
    // faltBush index - Building height
    flatIndexBuildingHeight: Map<number, number>,
    // flatBush index - osm id
    flatIndexOsmId: Map<number, number>,
    tileExtent: Extent,
    extrudeResult: {
        geometryAttribute: WireAttr[],
        boundingBoxMinMax: [number, number, number, number, number, number]
    }
}

export interface RetrieveProjected {
    type: "projected",
    features: SourceFeature[],
    z: number,
    x: number,
    y: number,
    // id: number
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    tileExtent: Extent,
    extrudeResult: {
        geometryAttribute: WireAttr[],
        boundingBoxMinMax: [number, number, number, number, number, number]
    }
}

export interface RetrieveHugging {
    type: "hugging",
    features: SourceFeature[],
    z: number,
    x: number,
    y: number,
    // id: number
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    tileExtent: Extent,
    extrudeResult: {
        geometryAttribute: WireAttr[],
        boundingBoxMinMax: [number, number, number, number, number, number]
    }
}
export interface RetrievePoint {
    type: "point",
    features: SourcePointFeature[],
    z: number,
    x: number,
    y: number,
    // id: number
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    tileExtent: Extent,
    boundingBoxMinMax: [number, number, number, number, number, number]
    textureIds: Float32Array;
    data: {
        instanceType: Tile3DInstanceType,
        lod0: {
            matrices: Float32Array[];
            instanceType: Tile3DInstanceType[];
            instanceTypeTextureIdMap: Map<Tile3DInstanceType, number>,
        },
        lod1: {
            matrices: Float32Array[];
            instanceType: Tile3DInstanceType[];
            instanceTypeTextureIdMap: Map<Tile3DInstanceType, number>,
        }
    }[]
}

const mercatorScale: number = 1.52122668;

export const ProjectedTextures = {
    Water: 0,
    Pavement: 1,
    Asphalt: 2,
    Cobblestone: 3,
    FootballPitch: 4,
    BasketballPitch: 5,
    TennisCourt: 6,
    ManicuredGrass: 7,
    Cycleway: 8,
    Railway: 9,
    Rock: 10,
    Sand: 11,
    Hedge: 12,
    WoodFence: 13,
    ConcreteFence: 14,
    AsphaltRoad: 15,
    AsphaltUnmarkedRoad: 16,
    ConcreteRoad: 17,
    ConcreteUnmarkedRoad: 18,
    ConcreteIntersection: 19,
    WoodRoad: 20,
    Helipad: 21,
    Garden: 22,
    Soil: 23,
    Grass: 24,
    ForestFloor: 25,
    ChainLinkFence: 26,
    MetalFence: 27,
    StoneWall: 28,
    ConcreteWall: 29,
    Farmland0: 30,
    Farmland1: 31,
    Farmland2: 32,
    Gravel: 33,
    DirtRoad: 34,
    SandRoad: 35,
    RailwayTop: 36,
    Rail: 37,
    GenericPitch: 38
} as const satisfies Record<string, number>;

export const ZIndexMap = {
    Park: 0,
    Water: 0 + 1,
    Grass: 1 + 1,
    Sand: 2 + 1,
    Rock: 3 + 1,
    ManicuredGrass: 4 + 1,
    Garden: 5 + 1,
    Construction: 6 + 1,
    Farmland: 7 + 1,
    Waterway: 8 + 1,
    Pitch: 9 + 1,
    ShrubberySoil: 10 + 1,
    Railway: 11 + 1,
    RailwayOverlay: 12 + 1,
    DirtRoadway: 13 + 1,
    SandRoadway: 14 + 1,
    RoadwayArea: 15 + 1,
    Footway: 16 + 1,
    WoodFootway: 17 + 1,
    AsphaltFootway: 17 + 1,
    FootwayArea: 18 + 1,
    Cycleway: 19 + 1,
    AsphaltRoadway: 20 + 1,
    ConcreteRoadway: 21 + 1,
    WoodRoadway: 22 + 1,
    CobblestoneRoadway: 23 + 1,
    AsphaltArea: 24 + 1,
    ConcreteArea: 25 + 1,
    CobblestoneArea: 26 + 1,
    Runway: 27 + 1,
    Rail: 28 + 1,
    Helipad: 29 + 1,
    Wall: 30 + 1,
    Fence: 31 + 1,
} as const satisfies Record<string, number>;

export enum SurfaceBuilderOrientation {
    Along,
    Across
}