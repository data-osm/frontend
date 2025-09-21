/// <reference lib="webworker" />

import { createXYZ, TileGrid } from "ol/tilegrid";
import { collectTransferables, RequestUpdatePointBuildingHeigh, UpdatePointBuildingHeightResponse } from "./type";
import { listBuildingHeight, TileIndexEntry } from "../building-elevation";
import { BufferAttribute } from "three";
import Vec3 from "../math/vector3";
import Vec2 from "../math/vector2";


const q: (() => void)[] = [];
let running = 0;
let concurrency = 15;
let results: UpdatePointBuildingHeightResponse[] = [];


let tilGrid: TileGrid = createXYZ({ tileSize: 512 })
let buffer: ArrayBuffer
let index: TileIndexEntry[]
let tileFlatIndexBuildingHeight: Map<string, Map<number, number>>

self.onmessage = (e) => {
    // console.log("message")
    const data = e.data
    const m: RequestUpdatePointBuildingHeigh = data.payload;
    buffer = m.buildingBuffer
    index = m.buildingIndex
    tileFlatIndexBuildingHeight = m.tileFlatIndexBuildingHeight

    const worker_id = data.id


    for (const tile of m.data) {
        q.push(() => updateMeshAndStickMeshWithBuildingHeight(tile.mesh, tile.stickMesh, tile.meshElevation, tile.tileCoordinates, tile.tileKey, worker_id));
    }
    pump();
}
function pump() {
    while (running < concurrency && q.length) {
        q.shift()!();
    }
}

const updateMeshAndStickMeshWithBuildingHeight = function (mesh: Float32Array, stickMesh: Float32Array, meshElevation: Float32Array, tileCoordinates: [number, number, number], tileKey: string, worker_id: number) {
    running++;
    const meshPosition = new BufferAttribute(mesh, 3)
    const stickPositions = new BufferAttribute(stickMesh, 4)
    const elevationAttribute = new BufferAttribute(meshElevation, 1)

    const tilePosition = new Vec3(tileCoordinates[0], tileCoordinates[1], tileCoordinates[2])

    const worldMeshPositions: Vec2[] = []
    for (let index = 0; index < meshPosition.count; index++) {
        const worldFeaturePosition = Vec3.add(new Vec3(meshPosition.getX(index), meshPosition.getY(index), meshPosition.getZ(index)), tilePosition)
        worldMeshPositions.push(new Vec2(worldFeaturePosition.x, worldFeaturePosition.y))
    }
    const positionsWithElevation = listBuildingHeight(tilGrid, buffer, index, tileFlatIndexBuildingHeight, worldMeshPositions)

    for (let index = 0; index < meshPosition.count; index++) {
        const elevation = elevationAttribute.getX(index)
        meshPosition.setZ(index, positionsWithElevation[index].z + elevation)
        stickPositions.setW(index, positionsWithElevation[index].z + elevation)
    }
    onFinishWithSuccess({
        mesh: meshPosition.array as Float32Array,
        stickMesh: stickPositions.array as Float32Array,
        tileKey: tileKey
    }, worker_id)
}

const onFinishWithSuccess = (features: UpdatePointBuildingHeightResponse, worker_id) => {
    results.push(features)
    running--
    pump()
    if (running === 0 && q.length === 0) {
        const payload = { requestId: worker_id, payload: { type: 'done', data: results } }
        postMessage(payload, collectTransferables(payload));
        results = []
    }

}