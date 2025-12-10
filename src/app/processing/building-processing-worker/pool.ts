import { LczZone } from "../../data/models/parameters";

import { SourceFeature } from "../building/type";
import { BufferAttributeJSON } from "three";



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