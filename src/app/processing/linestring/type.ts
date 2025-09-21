import { Extent } from "ol/extent";
import { BufferAttribute, BufferAttributeJSON } from "three";
import { BaseMessageMap } from "../../giro-3d-module";
import { WireAttr } from "../building-processing-worker/worker-packer";

export type TypeLineProcessingTool = "flat" | "tube"
export interface RequestLineProcessing {
    type: string,
    capabilities: string
    lineProcessingTool: TypeLineProcessingTool
    /**
     * (properties: { [x: string]: any; }) => boolean
     */
    filterFeatureCondition: string
    /**
     * (properties: { [x: string]: any; }) => string
     */
    getPointTileGroupByFromFeature: string
    /**
     * (properties: { [x: string]: any; }) => { "color": string, [key: string]: any }
     */
    groupFeatureBy: string
    /**
     * (properties: { [x: string]: any; }) => number
     */
    getFeatureRadius: string
    /**
     * (properties: { [x: string]: any; }) => number
     */
    getFeatureId: string
    /**
     * (geometry: TubeGeometry, properties: { [key: string]: any }) => void
     */
    onGeometryCreated: string

    data: {
        baseUrl: string,
        identifiants: string,
        extents: Extent[],
        resolution: number,
        projection: string
    }
}
export interface LineFeatureByExtent {
    extentBottomLeft: [number, number],
    prefixKey: string,
    group: { "color": string, [key: string]: any },
    features: { [x: string]: any, geometryExtent: Extent }[],
    instancePositions: Float32Array[],
    finalGeometryJson: WireAttr[];
    boundingBoxMinMax: number[];
    osmIdsFeatureIndex: Map<number, number>
    featureIndexOsmId: Map<number, number>
    geometryIndex: BufferAttribute
}

export type LineProcessingMessageType = 'LineProcessing';

export interface LineProcessingMessageMap extends BaseMessageMap<LineProcessingMessageType> {
    PointProcessing: {
        payload: RequestLineProcessing;
        response: {
            type: "done" | "error"
            data: LineFeatureByExtent[]
        }
    };
}

export function createLineProcessingWorker() {
    return new Worker(new URL("./linestring.worker.ts", import.meta.url), {
        type: 'module',
        name: 'LineProcessing',
    });
};