// // mvt-worker.ts (Worker module)
// import { VectorTile } from '@mapbox/vector-tile';
// import Pbf from 'pbf';
// import { Transform, MVT, Polygon } from './ol-module';
// import listElevation from './processing/elevation/listElevation';
// import { ElevationFeature } from './processing/elevation/pool';
// import { build3dBuildings } from './processing/build3dBuilding';
// import { Vector3 } from 'three';
// import { SourceFeature } from './processing/building/type';
// import { SkeletonBuilder } from "straight-skeleton";


// let moduleReady: Promise<void>;


// interface Tile {
//     id: number; url: string; z: number; x: number; y: number; tileExtent: [number, number, number, number], tileBottomLeft: [number, number]
// }
// interface Fetch {
//     batchTile: Array<Tile>
//     capabilities: any
// }
// type FetchMsg = { type: 'fetch'; Fetch };
// type AbortMsg = { type: 'abort'; id: number };
// type ConfigMsg = { type: 'config'; concurrency?: number; target?: 'geojson' | 'lines' };
// type InMsg = FetchMsg | AbortMsg | ConfigMsg;

// type DoneMsg = {
//     type: 'done';
//     id: number;
//     z: number; x: number; y: number;
//     // Exemple simple: on renvoie des segments en coordonnées WebMercator (m)
//     // pour peindre rapidement en Three.js; adapte selon ton usage (polygones, buffers 3D…)
//     lines: Float32Array; // [x0,y0,x1,y1,  x2,y2,x3,y3, ...]
// };
// type ErrMsg = { type: 'error'; id: number; message?: string; name?: string };

// const inflight = new Map<number, AbortController>();
// const q: (() => Promise<void>)[] = [];
// let running = 0;
// let concurrency = 8;
// let tileExtent = 4096; // extent MVT par défaut

// (self as any).onmessage = async (e) => {
//     await moduleReady;

//     const m = e.data;
//     if (m.type === 'config') { if (m.concurrency) concurrency = Math.max(1, m.concurrency | 0); return; }
//     if (m.type === 'fetch') {

//         for (const t of m.batchTile) q.push(() => runOne(t, m.capabilities)); // réutilise ta pump()/concurrency
//         pump();
//     }
//     if (m.type === 'abort') { inflight.get(m.id)?.abort(); return; }
// };

// function pump() {
//     while (running < concurrency && q.length) {
//         startNext();
//     }
// }

// let tileResult = []
// let errors = []

// function startNext() {
//     running++;
//     const task = q.shift()!;
//     Promise.resolve()
//         .then(task)
//         .catch((err) => {
//             // log/ignore AbortError ici si besoin
//             if (err?.name !== 'AbortError') console.error(err);
//         })
//         .finally(() => {
//             running--;
//             pump(); // ← relance pour remplir le slot libre
//             if (running === 0 && q.length === 0) {
//                 (self as any).postMessage({ type: 'done', tileResult });
//                 tileResult = []; errors = [];
//             }
//         });
// }


// async function runOne(tile: Tile, capabilities) {
//     // running++;

//     const { id, url, z, x, y, tileExtent, tileBottomLeft } = tile;
//     const worldBuildingPosition = new Vector3(tileBottomLeft[0], tileBottomLeft[1], 0)
//     const tile_key = x + "_" + y
//     const ctrl = new AbortController();
//     inflight.set(id, ctrl);
//     try {
//         const res = await fetch(url, { signal: ctrl.signal });
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const ab = await res.arrayBuffer();
//         const _mvt = new MVT()
//         const features = _mvt.readFeatures(ab, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857', extent: tileExtent });

//         const data = features.filter((jsonFeature) => {
//             return ["bench", "construction", "streetLamp", "busStop"].indexOf(jsonFeature.getProperties()["type"]) == -1
//         })
//             .filter((f) => {
//                 return f.getType() == "Polygon"
//             })
//             .map((f) => {
//                 const polygon = new Polygon(f.getOrientedFlatCoordinates(), 'XY', f.getEnds())
//                 return {
//                     "properties": f.getProperties(),
//                     "coordinates": polygon.getCoordinates(),
//                     "flatCoordinates": f.getFlatCoordinates(),
//                     "ends": f.getEnds(),
//                     "center": f.getFlatMidpoint()
//                 }
//             });

//         const result = await listElevation(data as Array<ElevationFeature>, capabilities) as SourceFeature[];

//         const extrudedBuildings = build3dBuildings(result, worldBuildingPosition, tile_key);
//         tileResult.push({
//             "id": id,
//             "z": z,
//             "x": x,
//             "y": y,
//             "features": result,
//             "extrudedBuildings": extrudedBuildings
//         })
//         // (self as any).postMessage({ type: 'done', id, z, x, y, features: result });
//     } catch (e: any) {
//         console.error(e)
//         // if (e?.name !== 'AbortError') (self as any).postMessage(<ErrMsg>{ type: 'error', id, name: e?.name, message: e?.message });
//     } finally {
//         inflight.delete(id);
//         // running--;
//         // pump();
//         // if (running === 0 && q.length === 0) {
//         //     (self as any).postMessage({ type: 'done', tileResult });
//         //     tileResult = []; errors = [];
//         // }
//     }
// }


// moduleReady = SkeletonBuilder.init().then(() => {
//     // console.log('Module initialized');
// });
