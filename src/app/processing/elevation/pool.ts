import { BaseMessageMap } from "@giro3d/giro3d/utils/WorkerPool";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import { Vector3 } from "three";

const CAPABILITIES_URL = "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";

export type ListElevationsMessageType = 'ListElevation';
export interface ListElevationMessageMap extends BaseMessageMap<ListElevationsMessageType> {
    ListElevation: {
        capabilities: any
        // [longitude, latitude, index]
        coordinates_with_index: [number, number, number | string][],
        payload: unknown;
        response: {
            elevations: Map<number | string, number>
        };
    };
}

export function createListElevationWorker() {
    return new Worker(new URL("./elevation.worker.ts", import.meta.url), {
        type: 'module',
        name: 'ListElevation',
    });
}

let WmtsCapabilities
export async function getCapabilities(): Promise<unknown> {
    if (WmtsCapabilities) {
        return WmtsCapabilities
    }
    const parser = new WMTSCapabilities();
    const res = await fetch(CAPABILITIES_URL);
    const text = await res.text();
    const capabilities = parser.read(text);
    WmtsCapabilities = capabilities
    return capabilities;
}