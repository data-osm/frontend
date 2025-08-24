/// <reference lib="webworker" />


import { SkeletonBuilder } from "straight-skeleton";
import { build3dBuildings } from "../../processing/build3dBuilding";
import { RetrieveBuilding, SourceFeature } from "../../processing/building/type";
import { packExtrudedForTransfer, InputExtruded, ExtrudedTile } from "./worker-packer";



const ABORT_ENABLED = false
let moduleReady: Promise<void>;

let concurrency = 1
let running = 0;
const q = []
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 min


self.onmessage = async (e) => {
    const data = e.data
    await moduleReady;
    if (ABORT_ENABLED) {

        await dbPromise;
    }

    const command: {
        exec: "extrude" | "abort"; tiles: RetrieveBuilding[]; tilesToAbort: number[]
    } = data.payload

    if (command.exec == "abort") {

        await clearAll()
        await storeTileIdToAbort(command.tilesToAbort)
    } else {
        const m: {
            z: number,
            x: number,
            y: number,
            id: number,
            tile_key: string,
            worldBuildingPosition: [number, number, number],
            features: SourceFeature[]
        }[] = command.tiles;
        const worker_id = data.id

        m.sort((a, b) => a.id - b.id)

        if (m.length === 0) return
        for (const t of m) q.push(() => runOne(t, worker_id)); // réutilise ta pump()/concurrency
        pump();
    }
}
// addEventListener('message', async ({ data }) => {

//     await moduleReady;

//     const command: {
//         exec: "extrude" | "abort"; tiles: {
//             z: number,
//             x: number,
//             y: number,
//             id: number,
//             tile_key: string,
//             worldBuildingPosition: [number, number, number],
//             features: SourceFeature[]
//         }[]
//     } = data.payload

//     if (command.exec == "abort") {
//         console.log(Array.from(inflight.keys()), q.length, "to abort")
//     } else {
//         const m: {
//             z: number,
//             x: number,
//             y: number,
//             id: number,
//             tile_key: string,
//             worldBuildingPosition: [number, number, number],
//             features: SourceFeature[]
//         }[] = command.tiles;
//         const worker_id = data.id

//         m.sort((a, b) => a.id - b.id)

//         if (m.length === 0) return
//         for (const t of m) q.push(() => runOne(t, worker_id)); // réutilise ta pump()/concurrency
//         pump();
//     }


// });



function pump() {
    while (running < concurrency && q.length) q.shift()!();
}

const runOne = async function (tile: {
    z: number,
    x: number,
    y: number,
    id: number,
    tile_key: string,
    worldBuildingPosition: [number, number, number],
    features: SourceFeature[]
}, worker_id) {
    running++
    const tileId = `${tile.z}/${tile.x}/${tile.y}`;
    if (ABORT_ENABLED) {

        const shouldBeExtrude = await retrieveAndDeleteIfExistTileIdToAbort(tile.id)
        if (shouldBeExtrude) {
            console.log("aborted tile", tile.id)
            postMessage(
                {
                    requestId: worker_id,
                    payload: { "error": false, "aborted": true, "tile_key": tile.tile_key, id: tile.id, tileId },
                },
            );
            running--

            pump();
        }
    }

    let extruded: ExtrudedTile
    try {

        extruded = build3dBuildings(tile.features, tile.worldBuildingPosition, tile.tile_key)
    } catch (error) {
        console.error(error)
        extruded = null
    }


    // if there is no features for some reasons, extruded will be null
    if (extruded) {

        // @ts-expect-error
        extruded.id = tile.id
        // @ts-expect-error
        extruded.tileId = tileId
        let { wire, transfers } = packExtrudedForTransfer([extruded as InputExtruded]);

        postMessage(
            {
                requestId: worker_id,
                payload: wire,
            },
            transfers
        );
        wire = null
        transfers = null
        // }
        // const t1 = performance.now();
        // console.log(`Tempsécoulé build3dBuildings : ${(t1 - t0).toFixed(2)} ms`, tile.features.length);
    } else {

        postMessage(
            {
                requestId: worker_id,
                payload: { "error": true, "tile_key": tile.tile_key, id: tile.id, tileId },
            },
        );
    }
    running--

    pump();
}
moduleReady = SkeletonBuilder.init().then(() => {
    // console.log('Module initialized');
});

const storeTileIdToAbort = async (tileIds: number[]) => {
    const tx = dbIndexDatabase.transaction("abort", 'readwrite');
    const dbIndexAbortTable = tx.objectStore("abort");
    const now = Date.now();
    for (const tileId of tileIds) {
        const req = dbIndexAbortTable.put({ id: tileId, expiresAt: now + DEFAULT_TTL_MS });
    }
    return txDone(tx);
};

const listTileIdToAbort = async () => {
    const tx = dbIndexDatabase.transaction("abort", 'readwrite');
    const dbIndexAbortTable = tx.objectStore("abort");
    const req = dbIndexAbortTable.getAll();
    return txDone(tx).then(() => req.result);
}

const retrieveAndDeleteIfExistTileIdToAbort = async (tileId: number): Promise<boolean> => {
    let tx = dbIndexDatabase.transaction("abort", 'readwrite');
    let dbIndexAbortTable = tx.objectStore("abort");
    const req = dbIndexAbortTable.get(tileId);
    await txDone(tx)
    if (req.result) {
        // console.log(req.result)
        tx = dbIndexDatabase.transaction("abort", 'readwrite');
        dbIndexAbortTable = tx.objectStore("abort");
        dbIndexAbortTable.delete(tileId);
        return txDone(tx).then(() => true);
    }
    return false

}

async function pruneExpired(now = Date.now()): Promise<number> {

    const tx = dbIndexDatabase.transaction("abort", 'readwrite');
    const idx = tx.objectStore("abort").index("expiresAt");
    const upper = IDBKeyRange.upperBound(now);
    let deleted = 0;
    const req = idx.openCursor(upper);
    await new Promise<void>((resolve, reject) => {
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
            const cur = req.result as IDBCursorWithValue | null;
            if (!cur) return resolve();
            cur.delete();
            deleted++;
            cur.continue();
        };
    });
    await txDone(tx);
    return deleted;
}

async function clearAll(): Promise<void> {
    const tx = dbIndexDatabase.transaction("abort", 'readwrite');
    tx.objectStore("abort").clear();
    await txDone(tx);
}

let dbIndexDatabase: IDBDatabase

let dbPromise = openDB().then((db) => {
    dbIndexDatabase = db
    // const tx = db.transaction("abort", 'readwrite');
    // const dbIndexAbortTable = tx.objectStore("abort");
    // await txDone(tx)
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
        const req = self.indexedDB.open("extrude-buildings", 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("abort")) {
                const os = db.createObjectStore("abort", { keyPath: 'id' });
                os.createIndex("expiresAt", "expiresAt", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}