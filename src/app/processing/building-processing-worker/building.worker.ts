/// <reference lib="webworker" />

import { Transform, MVT, Polygon } from '../../ol-module';
import listElevation from '../elevation/listElevation';
import { ElevationFeature } from '../elevation/pool';
import { BuildingProperties, RetrieveBuilding, SourceFeature, SourceProperties } from '../building/type';
import { SkeletonBuilder } from "straight-skeleton";
import { inflateCoordinatesArray } from "ol/geom/flat/inflate";
import { LEVEL_HEIGHT } from '../building/building-params';
import Flatbush from 'flatbush';
import { ExtrudedTile, formatBufferGeometryAttributes, WireAttr } from './worker-packer';
import { build3dBuildings } from '../build3dBuilding';
import { collectTransferables } from '../points/type';
import { RequestBuildingProcessing } from './pool';
import { LczZone } from '../../data/models/parameters';

const MAX_BATCH_ITEMS = 5;
interface Tile {
    id: number; url: string; z: number; x: number; y: number; tileExtent: [number, number, number, number], tileBottomLeft: [number, number]
}
interface Fetch {
    batchTile: Array<Tile>
    capabilities: any
}
type FetchMsg = { type: 'fetch'; Fetch };
type AbortMsg = { type: 'abort'; id: number };
type ConfigMsg = { type: 'config'; concurrency?: number; target?: 'geojson' | 'lines' };
type InMsg = FetchMsg | AbortMsg | ConfigMsg;

type DoneMsg = {
    type: 'done';
    id: number;
    z: number; x: number; y: number;
    // Exemple simple: on renvoie des segments en coordonnées WebMercator (m)
    // pour peindre rapidement en Three.js; adapte selon ton usage (polygones, buffers 3D…)
    lines: Float32Array; // [x0,y0,x1,y1,  x2,y2,x3,y3, ...]
};
type ErrMsg = { type: 'error'; id: number; message?: string; name?: string };

let moduleReady: Promise<void>;
const inflight = new Map<number, AbortController>();
const q: (() => Promise<void>)[] = [];
let running = 0;
let concurrency = 5;
let outlineHeight: number
let skirtOffset: number
let lczZones: LczZone[] = []

addEventListener('message', async ({ data }) => {
    await moduleReady
    await dbPromise

    // await clearAll();

    const m: {
        type: 'fetch' | 'abort' | 'config';
        batchTile: RequestBuildingProcessing[];
        capabilities: any
        lczZones?: LczZone[]
        concurrency?: number
        skirtOffset?: number
        outlineHeight?: number
    } = data.payload;
    const worker_id = data.id

    outlineHeight = m.outlineHeight
    skirtOffset = m.skirtOffset
    lczZones = m.lczZones ?? []

    if (m.type === 'config') { if (m.concurrency) concurrency = Math.max(1, m.concurrency | 0); return; }
    if (m.type === 'fetch') {

        m.batchTile.sort((a, b) => a.id - b.id)
        // for (const t of m.batchTile) {
        //     console.log(t.x + "_" + t.y)
        // };
        for (const t of m.batchTile) q.push(() => runOne(t, m.capabilities, worker_id)); // réutilise ta pump()/concurrency
        pump(worker_id);
    }
    // if (m.type === 'abort') { inflight.get(m.id)?.abort(); return; }

});





function pump(worker_id) {
    //@ts-expect-error
    const module = SkeletonBuilder.module
    while (running < concurrency && q.length) {
        startNext(worker_id);
    }
}

let tileResult: { [id: string]: RetrieveBuilding } = {}
let errors = []

function flushBatch(worker_id) {
    // for (const t of Object.keys(tileResult)) {
    //     console.log(t)
    // };
    const payload = { requestId: worker_id, payload: { type: 'done', tileResult: Object.values(tileResult) } }
    postMessage(payload, collectTransferables(payload));
    tileResult = {}; errors = [];
}
function enqueueResult(worker_id) {

    if (Object.keys(tileResult).length >= MAX_BATCH_ITEMS) {
        flushBatch(worker_id);
    }
}

function startNext(worker_id) {
    running++;
    const task = q.shift()!;
    Promise.resolve()
        .then(task)
        .then(() => enqueueResult(worker_id))
        .catch((err) => {
            // log/ignore AbortError ici si besoin
            if (err?.name !== 'AbortError') console.error(err);
        })
        .finally(() => {
            running--;
            pump(worker_id); // relance pour remplir le slot libre
            if (running === 0 && q.length === 0) {
                flushBatch(worker_id);
                // // const { wire, transfers } = packTile(tileResult);

                // postMessage({ requestId: worker_id, payload: { type: 'done', tileResult: Object.values(tileResult) } });
                // tileResult = {}; errors = [];
            }
        });
}


async function runOne(tile: Tile, capabilities, worker_id) {
    // running++;
    const { id, url, z, x, y, tileExtent, tileBottomLeft } = tile;
    const worldBuildingPosition: [number, number, number] = [tileBottomLeft[0], tileBottomLeft[1], 0]
    const tile_key = x + "_" + y
    const ctrl = new AbortController();
    inflight.set(id, ctrl);
    const osm_id_in_tile = await getAllOsmIdsForTile(tile_key)
    // console.log(osm_id_in_tile)

    try {
        let res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let ab = await res.arrayBuffer();
        const _mvt = new MVT()
        let features = _mvt.readFeatures(ab, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857', extent: tileExtent });

        // clean up memory
        ab = null
        res = null
        const osmIdsToStore = []
        let data = features.filter((jsonFeature) => {
            return ["bench", "construction", "streetLamp", "busStop"].indexOf(jsonFeature.getProperties()["type"]) == -1
        }).filter((f) => {
            return f.getType() == "Polygon"
        }).filter((f) => {

            // If no osm id already in tile, we can not yet control wether this building is in the tile or not
            if (osm_id_in_tile.length == 0) {
                osmIdsToStore.push(f.getProperties()["osm_id"])
                return true
            }
            return osm_id_in_tile.indexOf(f.getProperties()["osm_id"]) != -1
        }).map((f) => {
            const coordinates = inflateCoordinatesArray(f.getOrientedFlatCoordinates(), 0, f.getEnds(), 2)
            const properties = f.getProperties() as SourceProperties;
            properties.buildingHeight = getBuildingParameters(properties).height * 1.3
            properties.center = f.getFlatMidpoint()
            properties.extent = f.getExtent()
            properties.coordinates = coordinates
            properties.tileKey = tile_key
            const lczZone = lczZones.find((lczZone) => lczZone.id == properties.lcz_outline_id)
            if (lczZone) {
                properties.station_id = lczZone.station_id
            }
            return {
                "properties": f.getProperties(),
                "coordinates": coordinates,
                "flatCoordinates": f.getFlatCoordinates(),
                "ends": f.getEnds(),
                "center": f.getFlatMidpoint(),
                "extent": f.getExtent(),
                "buildingHeight": properties.buildingHeight
            }
        })


        if (data.length === 0) {
            inflight.delete(id);
            postMessage({ requestId: worker_id, payload: { type: 'no_data', id: tile.id } });
            return
        };

        const index = new Flatbush(data.length);
        const flatIndexBuildingHeight = new Map<number, number>()
        const flatIndexOsmId = new Map<number, number>()
        for (let i = 0; i < data.length; i++) {
            const buildingIndex = index.add(data[i].extent[0], data[i].extent[1], data[i].extent[2], data[i].extent[3]);
            flatIndexBuildingHeight.set(buildingIndex, data[i].properties.buildingHeight)
            flatIndexOsmId.set(buildingIndex, data[i].properties.osm_id)
        }
        index.finish();

        // clean up memory
        features = null

        let result = await listElevation(data as Array<ElevationFeature>, capabilities) as SourceFeature[];

        if (osmIdsToStore.length > 0) {
            await storeOsmIdsInTile(tile_key, osmIdsToStore)
        }

        const extrudeResult: {
            geometryAttribute: WireAttr[],
            boundingBoxMinMax: [number, number, number, number, number, number]
        } = {
            geometryAttribute: null,
            boundingBoxMinMax: null
        }
        try {
            const extruded = build3dBuildings(result, worldBuildingPosition, tile_key, skirtOffset, outlineHeight)
            extrudeResult.boundingBoxMinMax = extruded.boundingBoxMinMax
            extrudeResult.geometryAttribute = formatBufferGeometryAttributes(extruded.geometriesJson)
        } catch (error) {
            console.error(error)
            inflight.delete(id);
            postMessage({ requestId: worker_id, payload: { type: 'can not extrude', id: tile.id } });
            return
            // extruded = null
        }
        // if (extruded) {
        //     // @ts-expect-error
        //     extruded.id = tile.id
        //     // @ts-expect-error
        //     extruded.tileId = tileId
        // }
        // clean up memory
        data = null
        // console.log(index.numItems, indexBytes.length << 2, id, "worker")
        tileResult[tile_key] = {
            z,
            x,
            y,
            id,
            tile_key,
            worldBuildingPosition,
            features: result,
            flatBushData: index.data,
            flatIndexBuildingHeight,
            flatIndexOsmId,
            tileExtent,
            extrudeResult: extrudeResult
        }


        // clean up memory
        result = null

    } catch (e: any) {
        console.error(e)
    } finally {
        inflight.delete(id);
    }
}



const getBuildingParameters = (properties: BuildingProperties) => {

    let minLevel = <number>properties.min_level ?? null;
    let height = <number>properties.height ?? null;
    let levels = <number>properties.levels ?? null;
    let minHeight = <number>properties.min_height ?? null;
    const roofLevels = properties.roof_levels <= 0 ? 0.6 : <number>properties.roof_levels ?? 0;
    let roofHeight = <number>properties.roof_height ?? (roofLevels * LEVEL_HEIGHT);

    if (height !== null) {
        roofHeight = Math.min(roofHeight, height - (minHeight ?? 0));
    }

    if (height === null && levels === null) {
        levels = (minLevel !== null) ? minLevel : 1;
        height = levels * LEVEL_HEIGHT + roofHeight
    } else if (height === null) {
        height = levels * LEVEL_HEIGHT + roofHeight
    } else if (levels === null) {
        levels = Math.max(1, Math.round((height - roofHeight) / LEVEL_HEIGHT));
    }

    if (minLevel === null) {
        if (minHeight !== null) {
            minLevel = Math.min(levels - 1, Math.round(minHeight / LEVEL_HEIGHT));
        } else {
            minLevel = 0;
        }
    }

    if (minHeight === null) {
        minHeight = Math.min(minLevel * LEVEL_HEIGHT, height);
    }
    const isRoof = properties.building_type === 'roof';
    let buildingMinHeight = isRoof ? (height - roofHeight) : minHeight


    return {
        height: height,
        minHeight: buildingMinHeight
    }
}


// DB INDEX TO HAVE ONLY ONE BUILDING PER TILE
const TABLE_NAME = 'unique_building_per_tile';
let dbIndexDatabase: IDBDatabase

const storeOsmIdsInTile = async (tile_key: string, osm_ids: number[]) => {
    const tx = dbIndexDatabase.transaction(TABLE_NAME, 'readwrite');
    const dbIndexTable = tx.objectStore(TABLE_NAME);
    for (const osm_id of osm_ids) {
        dbIndexTable.put({ osm_id: osm_id, tile_key: tile_key });
    }
    return txDone(tx).then(() => true);
}
const shouldInsertThisBuildingInTIle = async (tile_key: string, osm_id: number) => {
    let tx = dbIndexDatabase.transaction(TABLE_NAME, "readonly");
    let dbIndexTable = tx.objectStore(TABLE_NAME);
    const req = dbIndexTable.get(osm_id);
    await txDone(tx)
    if (req && req.result) {
        if (req.result.tile_key != tile_key) {
            // osm id already in another tile
            return false
        }
        return true
    }

    tx = dbIndexDatabase.transaction(TABLE_NAME, 'readwrite');
    dbIndexTable = tx.objectStore(TABLE_NAME);
    dbIndexTable.put({ osm_id: osm_id, tile_key: tile_key });
    return txDone(tx).then(() => true);

}

export async function getAllOsmIdsForTile(tileKey: string): Promise<number[]> {
    const tx = dbIndexDatabase.transaction(TABLE_NAME, 'readonly');
    const idx = tx.objectStore(TABLE_NAME).index(TABLE_NAME);


    const keys: number[] = await new Promise((resolve, reject) => {
        const r = idx.getAllKeys(IDBKeyRange.only(tileKey));
        r.onsuccess = () => resolve(r.result as number[]);
        r.onerror = () => reject(r.error);
    });


    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });

    return keys;
}

async function clearAll(): Promise<void> {

    const tx = dbIndexDatabase.transaction(TABLE_NAME, 'readwrite');
    tx.objectStore(TABLE_NAME).clear();
    await txDone(tx);
}

const dbPromise = openDB().then((db) => {
    dbIndexDatabase = db
});

function txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = self.indexedDB.open("buildings_worker", 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(TABLE_NAME)) {
                const os = db.createObjectStore(TABLE_NAME, { keyPath: 'osm_id' });
                os.createIndex(TABLE_NAME, 'tile_key', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

moduleReady = SkeletonBuilder.init().then(() => {
    // console.log('Module initialized');
});