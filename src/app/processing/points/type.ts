import { Projection } from "ol/proj";
import { Coordinate } from "../../ol-module"
import RenderFeature from "ol/render/Feature";
import { BaseMessageMap } from "../../giro-3d-module";
import { TileGrid } from "ol/tilegrid";
import { TileIndexEntry } from "../building-elevation";
import { Extent } from "ol/extent";

export interface PointFeatureByExtent {
    features: Array<{
        properties: { [key: string]: any },
        coordinate: Coordinate,
    }>,
    instancePositions: Float32Array
    instanceStickPositions: Float32Array
    instanceElevations: Float32Array,
    featureIds: Int32Array,
    osmIdsFeatureIndex: Map<number, number>
    featureIndexOsmId: Map<number, number>
    boundingBoxMinMax: [number, number, number, number, number, number],
    tileBottomLeft: [number, number],
    extent: Extent
}

export type PointProcessingMessageType = 'PointProcessing';
export interface RequestPointProcessing {
    type: string,
    capabilities: string,
    buildingBuffer: ArrayBuffer | undefined,
    buildingIndex: TileIndexEntry[] | undefined,
    tileFlatIndexBuildingHeight: Map<string, Map<number, number>> | undefined,
    data: {
        baseUrl: string,
        identifiants: string,
        extents: Extent[],
        resolution: number,
        projection: string
    }
}
export interface PointProcessingMessageMap extends BaseMessageMap<PointProcessingMessageType> {
    PointProcessing: {
        payload: RequestPointProcessing;
        response: {
            type: "done" | "error"
            data: PointFeatureByExtent[]
        }
    };
}

export interface UpdatePointBuildingHeightResponse {
    "mesh": Float32Array,
    "stickMesh": Float32Array,
    "tileKey": string
}
export type UpdatePointBuildingHeightMessageType = 'updatePointBuildingHeight';
export interface RequestUpdatePointBuildingHeigh {
    type: string,
    buildingBuffer: ArrayBuffer,
    buildingIndex: TileIndexEntry[],
    tileFlatIndexBuildingHeight: Map<string, Map<number, number>>,
    data: {
        "mesh": Float32Array,
        "stickMesh": Float32Array,
        "meshElevation": Float32Array,
        "tileCoordinates": [number, number, number],
        "tileKey": string
    }[]
}

export interface UpdatePointBuildingHeighMessageMap extends BaseMessageMap<UpdatePointBuildingHeightMessageType> {
    UpdatePointBuildingHeight: {
        payload: RequestUpdatePointBuildingHeigh;
        response: {
            type: "done" | "error"
            data: UpdatePointBuildingHeightResponse[]
        }
    };
}

type Transferables = (Transferable | ArrayBuffer)[];

export function collectTransferables(input: any, out = new Set<Transferable>()): Transferables {
    const visit = (x: any) => {
        if (!x) return;

        if (ArrayBuffer.isView(x)) {
            out.add(x.buffer as ArrayBuffer);
            return;
        }
        if (x instanceof ArrayBuffer) {
            out.add(x);
            return;
        }

        // Récursivité: Array
        if (Array.isArray(x)) {
            for (const v of x) visit(v);
            return;
        }
        // Map / Set
        if (x instanceof Map) {
            for (const v of x.values()) visit(v);
            return;
        }
        if (x instanceof Set) {
            for (const v of x.values()) visit(v);
            return;
        }
        // Objet simple
        if (typeof x === 'object') {
            for (const k of Object.keys(x)) visit(x[k]);
        }
    };

    visit(input);
    return Array.from(out);
}
