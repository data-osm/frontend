import Vec2 from "../../math/vector2";
import { OMBBResult } from "../ombb-params";
import Tile3DMultipolygon from "../tile3d-multipolygon";

export interface RoofSkirtPoint {
    position: Vec2;
    height: number;
}
export type RoofSkirtPolyline = {
    points: RoofSkirtPoint[];
    hasWindows: boolean;
};
export type RoofSkirt = RoofSkirtPolyline[];

export interface RoofBuilder {
    build(params: RoofParams): RoofGeometry;
}

export interface RoofGeometry {
    addSkirt: boolean;
    skirt?: RoofSkirt;
    facadeHeightOverride?: number;
    position: number[];
    normal: number[];
    uv: number[];
    canExtendOutsideFootprint?: boolean;
}

export interface RoofParams {
    multipolygon: Tile3DMultipolygon;
    buildingHeight: number;
    minHeight: number;
    height: number;
    direction: number;
    angle: number;
    orientation: 'along' | 'across';
    flip: boolean;
    scaleX: number;
    scaleY: number;
    isStretched: boolean;
}