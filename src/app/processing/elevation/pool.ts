import { Coordinate } from "ol/coordinate";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import { Vector3 } from "three";
import { BaseMessageMap } from "../../giro-3d-module";

const CAPABILITIES_URL = "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";

export type GeometryType = 'Point' | 'LineString' | 'LinearRing' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | "MultiPolygon";

export type ListElevationsMessageType = 'ListElevation';

export interface ElevationFeature {
    properties: { [key: string]: any },
    // default value is 'Point'
    geometryType?: GeometryType
    center?: Coordinate
    coordinates?: Coordinate[] | Array<Array<Coordinate>> | Array<Array<Array<Coordinate>>>
    [key: string]: any
}

export interface ListElevationMessageMap extends BaseMessageMap<ListElevationsMessageType> {
    ListElevation: {
        capabilities: any

        features: Array<ElevationFeature>
        payload: unknown;
        response: Array<ElevationFeature>
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