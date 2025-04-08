import { FillStyle, StrokeStyle } from "@giro3d/giro3d/core/FeatureTypes";
import { OMBBResult } from "./ombb-params";
import { Coordinate } from "ol/coordinate";
import { VectorAreaRing } from "./tile-3d-ring";

import Vec3 from "../math/vector3";

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
    "@ombb00": number
    "@ombb01": number
    "@ombb10": number
    "@ombb11": number
    "@ombb20": number
    "@ombb21": number
    "@ombb30": number
    "@ombb31": number
    buildingType: string
    color: number
    defaultRoof: boolean
    height: number
    isPart: boolean
    levels: number
    material: string
    minHeight: number
    minLevel: number
    name: string
    osmId: number
    osmType: number
    roofColor: number
    roofDirection: number
    roofHeight: number
    roofLevels: number
    type: string
    windows: boolean
    roofAngle?: number
    roofOrientation?: BuildingRoofOrientation
    roofMaterial?: BuildingRoofMaterial
    roofType?: BuildingRoofType
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
    descriptor: VectorAreaDescriptor;
    rings: VectorAreaRing[];
    isBuildingPartInRelation?: boolean;
}