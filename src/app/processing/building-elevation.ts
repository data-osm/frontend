import { TileGrid } from "ol/tilegrid";
import Vec2 from "./math/vector2";
import Flatbush from "flatbush";
import Vec3 from "./math/vector3";

export type TileIndexEntry = { tileKey: string; offset: number; length: number };
export type TileChunk = { tileKey: string; buffer: ArrayBuffer };

export interface PackedTiles {
    buffer: ArrayBuffer;
    used: number;
    align: number;
    index: TileIndexEntry[];
    posByTileKey: Map<string, number>;
}
const alignTo = (n: number, a: number) => (a > 0 ? n + ((a - (n % a)) % a) : n);
function ensureCapacity(store: PackedTiles, extra: number) {
    const need = store.used + extra;
    if (store.buffer.byteLength >= need) return;

    // stratégie: double la capacité jusqu'à couvrir le besoin
    let cap = Math.max(store.buffer.byteLength, 1024);
    while (cap < need) cap *= 2;

    const next = new ArrayBuffer(cap);
    new Uint8Array(next).set(new Uint8Array(store.buffer, 0, store.used));
    store.buffer = next;
}
export function addTile(store: PackedTiles, chunk: TileChunk): void {
    const { tileKey, buffer } = chunk;
    const len = buffer?.byteLength ?? 0;
    const padded = alignTo(len, store.align);

    ensureCapacity(store, padded);

    const offset = store.used;
    if (len > 0) {
        new Uint8Array(store.buffer, offset, len).set(new Uint8Array(buffer));
    }

    const pos = store.posByTileKey.get(tileKey);
    if (pos === undefined) {
        store.index.push({ tileKey, offset, length: len });
        store.posByTileKey.set(tileKey, store.index.length - 1);
    } else {
        // mise à jour en place (remplacement)
        store.index[pos].offset = offset;
        store.index[pos].length = len;
    }

    store.used += padded; // avance avec padding
}

export function finalizePackedTiles(store: PackedTiles): { buffer: ArrayBuffer; index: TileIndexEntry[] } {
    const tight = new ArrayBuffer(store.used);
    new Uint8Array(tight).set(new Uint8Array(store.buffer, 0, store.used));
    // shallow copy de l’index pour figer l’instantané
    return { buffer: tight, index: store.index.slice() };
}

export function toTransferable(store: PackedTiles): { buffer: ArrayBuffer; used: number; index: TileIndexEntry[] } {
    return { buffer: store.buffer, used: store.used, index: store.index.slice() };
}

const flatBushMap: Map<string, Flatbush> = new Map()

// <tileKey,<building flat index, building height>>
// tileFlatIndexBuildingHeight
export function listBuildingHeight(tilGrid: TileGrid, buffer: ArrayBuffer, index: TileIndexEntry[], tileFlatIndexBuildingHeight: Map<string, Map<number, number>>, positions: Vec2[]): Vec3[] {
    const results: Vec3[] = []
    for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const positionWithHeight = new Vec3(position.x, position.y, 20);
        results.push(positionWithHeight)
        const pointTileCoord = tilGrid.getTileCoordForCoordAndZ([position.x, position.y], 16)
        if (pointTileCoord) {
            const tileKey = pointTileCoord[1] + "_" + pointTileCoord[2]
            const tileBuildingHeightIndex = tileFlatIndexBuildingHeight.get(tileKey)
            const tileIndex = index.find((entry) => entry.tileKey === tileKey)
            if (tileIndex) {
                let flatBush = flatBushMap.get(tileKey)
                if (!flatBush) {
                    flatBush = Flatbush.from(buffer, tileIndex.offset);
                    flatBushMap.set(tileKey, flatBush)
                }
                const buildingIntersecting = flatBush.neighbors(position.x, position.y, 2)
                positionWithHeight.z = Math.max(...buildingIntersecting.map((flatIndex) => tileBuildingHeightIndex.get(flatIndex)))
                positionWithHeight.z = Math.max(positionWithHeight.z, 20)
            }
            // else {
            //     console.error("tile index not found")
            // }
        } else {
            console.error("tile not found")
        }
    }
    return results
}