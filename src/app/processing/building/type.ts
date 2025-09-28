
import { OMBBResult } from "./ombb-params";
import { Coordinate } from "ol/coordinate";
import { VectorAreaRing } from "./tile-3d-ring";

import Vec3 from "../math/vector3";
import { Extent } from "ol/extent";
import { FillStyle, StrokeStyle } from "../../giro-3d-module";
import { Skeleton } from "straight-skeleton";
import { ExtrudedTile, WireAttr } from "../building-processing-worker/worker-packer";

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

}

export interface VectorAreaDescriptor {
    label?: string;
    type: 'building' | 'buildingPart' | 'asphalt' | 'roadwayIntersection' | 'pavement' | 'water' | 'farmland' |
    'grass' | 'sand' | 'rock' | 'pitch' | 'manicuredGrass' | 'helipad' | 'forest' | 'garden' | 'construction' |
    'buildingConstruction' | 'shrubbery' | 'roadwayArea';
    intersectionMaterial?: 'asphalt' | 'concrete' | 'cobblestone';
    pitchType?: 'generic' | 'football' | 'basketball' | 'tennis';
    // treeType?: TreeType;
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
    rnb: string
    match_rnb_ids: string;
    building: string
    is_part: boolean
    skeleton?: Skeleton
    lcz_outline_id?: number
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


export interface VectorNode {
    type: 'node';
    osmReference: null;
    descriptor: VectorAreaDescriptor;
    x: number;
    y: number;
    rotation: number;
}

export interface VectorArea {
    type: 'area';
    osmReference: null;
    elevation: number;
    descriptor: VectorAreaDescriptor;
    rings: VectorAreaRing[];
    isBuildingPartInRelation?: boolean;
    // featureId: number
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
    ends: number[] | Array<Array<number>>,
    coordinates: any,
    flatCoordinates: Array<number>,
    center: Coordinate,
}

export interface RetrieveBuilding {
    features: SourceFeature[],
    z: number,
    x: number,
    y: number,
    id: number
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    flatBushData: ArrayBuffer,
    // faltBush index - Building height
    flatIndexBuildingHeight: Map<number, number>,
    // flatBush index - osm id
    flatIndexOsmId: Map<number, number>,
    tileExtent: [number, number, number, number],
    extrudeResult: {
        geometryAttribute: WireAttr[],
        boundingBoxMinMax: [number, number, number, number, number, number]
    }
}