import { BaseMessageMap } from "../../giro-3d-module";
import { SourceFeature } from "../building/type";
import { BufferAttributeJSON } from "three";

export type buildingProcessingMessageType = 'buildingProcessing';
export interface RequestBuildingProcessing {
    id: number,
    z: number,
    x: number,
    y: number,
    url: string,
    tileExtent,
    tileBottomLeft: [number, number]
}
export interface BuildingProcessingMessageMap extends BaseMessageMap<buildingProcessingMessageType> {
    buildingProcessing: {
        type: string
        batchTile: Array<RequestBuildingProcessing>
        capabilities: any
        payload: unknown;
        response: {
            type: "done" | "error"
            tileResult: Array<{
                "id": number,
                "z": number,
                "x": number,
                "y": number,
                "features": SourceFeature[],
                "extrudedBuildings": {
                    tile_key: string;
                    geometriesJson: {
                        key: string;
                        data: BufferAttributeJSON | {
                            isInterleavedBufferAttribute: true;
                            itemSize: number;
                            data: string;
                            offset: number;
                            normalized: boolean;
                        };
                    }[];
                }
            }>
        }
    };
}

export function createBuildingProcessingWorker() {
    return new Worker(new URL("./building.worker.ts", import.meta.url), {
        type: 'module',
        name: 'buildingProcessing',
    });
};

export function createExtrudeWorker() {
    return new Worker(new URL('./extrude.worker.ts', import.meta.url), {
        type: 'module',
        name: 'ExtrudeBuildings',
    });
}