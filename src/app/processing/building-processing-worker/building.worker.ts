/// <reference lib="webworker" />

import { Transform, MVT, Polygon, LineString, MultiLineString, MultiPolygon } from '../../ol-module';
import listElevation from '../elevation/listElevation';
import { ElevationFeature, GeometryType } from '../elevation/pool';
import { BuildingProperties, RetrieveBuilding, RetrieveHugging, RetrievePoint, RetrieveProjected, SourceFeature, SourceLineFeature, SourcePointFeature, SourceProperties, SurfaceVectorLineDescriptor } from '../building/type';
import { SkeletonBuilder } from "straight-skeleton";
import { inflateCoordinatesArray } from "ol/geom/flat/inflate";
import { inflateEnds } from 'ol/geom/flat/orient.js';
import { LEVEL_HEIGHT } from '../building/building-params';
import Flatbush from 'flatbush';
import { ExtrudedTile, formatBufferGeometryAttributes, mergeBoundingBox, mergeGeometryAttributes, updateIndexInGeometry, WireAttr } from './worker-packer';
import { build3dBuildings } from '../build3dBuilding';
import { collectTransferables } from '../points/type';
// import { RequestBuildingProcessing,BuildingProcessingMessageMap } from './pool';
import { LczZone } from '../../data/models/parameters';
import { bool, string } from 'three/src/nodes/TSL';
import RenderFeature from 'ol/render/Feature';
import { BufferAttributeJSON, Line } from 'three';
import { generateSurfaceGeometries } from '../polygon/generate-polygon-geometries';
import { generateLineGeometries } from '../linestring/create-linstring-geometries';
import { createPointGeometries } from '../points/create-point-geometries';
import RoadGraph from '../linestring/road-graph/RoadGraph';
import { LinesStringWithZ, MultiLineStringWithZ } from '../utils';
import { MultiPoint } from 'ol/geom';

import { BaseMessageMap } from "../../giro-3d-module";
import { Message, SuccessResponse } from '@giro3d/cgiro3d/utils/WorkerPool';
import { containsExtent, Extent, getCenter, intersects } from 'ol/extent';
export type buildingProcessingMessageType = 'buildingProcessing';

export interface RequestFeaturesProcessingInTile {
    z: number,
    x: number,
    y: number,
    url: string,
    tileExtent: Extent,
    extentBottomLeft: [number, number],
    tileSize: number,
    id: number | string

}

interface FeatureProcessResponse {
    id: number | string, building?: RetrieveBuilding, projected?: RetrieveProjected[], point?: RetrievePoint, hugging?: RetrieveHugging
}

export interface BuildingProcessingMessageMap extends BaseMessageMap<buildingProcessingMessageType> {
    buildingProcessing: {
        payload: {
            type: string
            tiles: RequestFeaturesProcessingInTile[],
            // id: number,
            // default elevation, only for polygons and lines
            defaultElevation?: number
            excludeLayers: ("points" | "polygons" | "lines" | "buildings")[]
            segment: number,
            skirtOffset: number,
            outlineHeight: number,
            lczZones: LczZone[],
            capabilities: any
        };
        response: {
            type: "done" | "error" | "no_data"
            result: FeatureProcessResponse[]
        }
    };
}

export type ProcessFeaturesInExtentMessage = Message<BuildingProcessingMessageMap["buildingProcessing"]["payload"]>;
export type ProcessFeaturesInExtentResponse = SuccessResponse<BuildingProcessingMessageMap["buildingProcessing"]["response"]>;



let moduleReady: Promise<void>;
// const inflight = new Map<number, AbortController>();
const q: (() => Promise<void>)[] = [];
let running = 0;
let concurrency = 1;
const MAX_BATCH_ITEMS = 1
// let outlineHeight: number
// let skirtOffset: number
// let lczZones: LczZone[] = []


function sendNoData(worker_id, tileId: number) {
    tileResult.push({ id: tileId })
}
addEventListener('message', async ({ data }: { data: ProcessFeaturesInExtentMessage }) => {
    await moduleReady
    await dbPromise

    // await clearAll();

    // const m:BuildingProcessingMessageMap["buildingProcessing"] = data
    // const m: {
    //     type: 'fetch' | 'abort' | 'config';
    //     batchTile: RequestBuildingProcessing[];
    //     capabilities: any
    //     lczZones?: LczZone[]
    //     concurrency?: number
    //     skirtOffset?: number
    //     outlineHeight?: number
    // } = data.payload;
    const worker_id = data.id


    // outlineHeight = data.payload.outlineHeight
    // skirtOffset = data.payload.skirtOffset
    // lczZones = data.payload.lczZones ?? []

    // if (m.type === 'config') { if (m.concurrency) concurrency = Math.max(1, m.concurrency | 0); return; }
    if (data.payload.type === 'fetch') {

        // m.batchTile.sort((a, b) => a.id - b.id)
        // for (const t of m.batchTile) {
        //     console.log(t.x + "_" + t.y)
        // };
        // for (const t of data.payload.tiles) q.push(() => runOne(t, worker_id)); // réutilise ta pump()/concurrency
        q.push(() => runOne(data.payload, worker_id))
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

let tileResult: BuildingProcessingMessageMap["buildingProcessing"]["response"]["result"] = []
let errors = []

function flushBatch(worker_id) {

    const payload: ProcessFeaturesInExtentResponse = { requestId: worker_id, payload: { type: 'done', result: tileResult } }
    postMessage(payload, collectTransferables(payload));
    tileResult = []; errors = [];
}
function enqueueResult(worker_id) {

    if (tileResult.length >= MAX_BATCH_ITEMS) {
        flushBatch(worker_id);
    }
}

function startNext(worker_id) {
    running++;
    const task = q.shift()!;
    Promise.resolve()
        .then(task)
        // .then(() => enqueueResult(worker_id))
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

function getGeometryType(renderFeature) {
    const geometryType = renderFeature.getType();
    switch (geometryType) {
        case 'Point':
            return 'Point';
        case 'MultiPoint':
            return 'MultiPoint';
        case 'LineString':
            return 'LineString';
        case 'MultiLineString':
            return 'MultiLineString';
        case 'Polygon':
            const ends = renderFeature.getEnds();
            const endss = inflateEnds(renderFeature.getFlatCoordinates(), ends);
            if (endss.length > 1) return 'MultiPolygon';
            return 'Polygon';
        default:
            throw new Error('Invalid geometry type:' + geometryType);
    }
}
function getCoordinates(renderFeature) {
    const geometryType = renderFeature.getType();
    switch (geometryType) {
        case 'Point':
            return renderFeature.getFlatCoordinates();
        case 'MultiPoint':
            return new MultiPoint(renderFeature.getFlatCoordinates(), 'XY').getCoordinates();
        case 'LineString':
            return new LineString(renderFeature.getFlatCoordinates(), 'XY').getCoordinates();
        case 'MultiLineString':
            return new MultiLineString(
                renderFeature.getFlatCoordinates(),
                'XY',
        /** @type {Array<number>} */(renderFeature.getEnds()),
            ).getCoordinates();
        case 'Polygon':
            const flatCoordinates = renderFeature.getFlatCoordinates();
            const ends = renderFeature.getEnds();
            const endss = inflateEnds(flatCoordinates, ends);
            return endss.length > 1
                ? new MultiPolygon(flatCoordinates, 'XY', endss).getCoordinates()
                : new Polygon(flatCoordinates, 'XY', ends).getCoordinates();
        default:
            throw new Error('Invalid geometry type:' + geometryType);
    }
}

async function fetchFeatures(tile: RequestFeaturesProcessingInTile) {
    let res = await fetch(tile.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let ab = await res.arrayBuffer();
    const _mvt = new MVT()
    const features = _mvt.readFeatures(ab, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857', extent: tile.tileExtent });

    return features
    // .filter((f) => {
    //     // return containsExtent(tile.tileExtent, f.getExtent())
    //     if (!containerExtent) return true;
    //     return containsExtent(containerExtent, f.getExtent()) || intersects(containerExtent, f.getExtent())
    // })

}

async function runOne(payload: BuildingProcessingMessageMap["buildingProcessing"]["payload"], worker_id) {
    // const t0 = performance.now();
    for (let i = 0; i < payload.tiles.length; i++) {
        const tile = payload.tiles[i];
        const { x, y, z } = tile
        const worldBuildingPosition: [number, number, number] = [tile.extentBottomLeft[0], tile.extentBottomLeft[1], 0]
        const extentCenter = getCenter(tile.tileExtent)
        const tile_key = extentCenter[0] + "_" + extentCenter[1]
        const t0 = performance.now();
        const osm_id_in_tile = await getAllOsmIdsForTile(tile_key)
        try {
            let features = await fetchFeatures(tile);
            const osmIdsToStore = []

            let data = features.filter((f) => {
                // if (f.getProperties()["osm_id"] == 627750398) {
                //     console.log(osm_id_in_tile.indexOf(f.getProperties()["osm_id"]) != -1, tile_key, 627750398)
                // }
                // if (f.getProperties()["osm_id"] == 97855859) {
                //     console.log(f, "f", 97855859)
                // }
                // If no osm id already in tile, we can not yet control wether this building is in the tile or not
                // if (osm_id_in_tile.length == 0) {
                //     osmIdsToStore.push(f.getProperties()["osm_id"])
                //     return true
                // }
                // return osm_id_in_tile.indexOf(f.getProperties()["osm_id"]) != -1
                return true
            }).map((f) => {
                // const coordinates = inflateCoordinatesArray(f.getOrientedFlatCoordinates(), 0, f.getEnds(), 2)
                const coordinates = getCoordinates(f)
                const properties = f.getProperties() as SourceProperties;
                properties.buildingHeight = getBuildingParameters(properties).height * 1.3
                properties.center = f.getFlatMidpoint()
                properties.extent = f.getExtent()
                properties.coordinates = coordinates
                // properties.tileKey = tile_key
                const lczZone = (payload.lczZones || []).find((lczZone) => lczZone.id == properties.lcz_outline_id)
                if (lczZone) {
                    properties.station_id = lczZone.station_id
                }
                const endss = inflateEnds(f.getFlatCoordinates(), f.getEnds());
                const geometryType = getGeometryType(f);
                return {
                    "properties": f.getProperties(),
                    "geometryType": geometryType as GeometryType,
                    "coordinates": coordinates,
                    "flatCoordinates": f.getFlatCoordinates(),
                    "ends": endss.length > 1 && geometryType == "MultiPolygon" ? endss : f.getEnds(),
                    "center": f.getFlatMidpoint(),
                    "extent": f.getExtent(),
                    "buildingHeight": properties.buildingHeight
                }
            })


            if (data.length === 0) {
                // inflight.delete(id);
                // sendNoData(worker_id, tile.id)
                continue
            };

            let buildings = data.filter((jsonFeature) => {
                //  f.getType() == "Polygon"
                // && !Array.isArray(jsonFeature.ends[0])
                // jsonFeature.geometryType == 'Polygon' &&
                return jsonFeature.geometryType == 'Polygon' && jsonFeature.properties.layer == 'buildings'
            }).map((jsonFeature) => {
                // TODO: For list elevation (to be fixed)
                jsonFeature.geometryType = 'Point'
                return jsonFeature
            })

            let polygons = data.filter((jsonFeature) => {

                return ["polygons", "landuses"].indexOf(jsonFeature.properties.layer) != -1
            })

            let lines = data.filter((jsonFeature) => {

                return jsonFeature.properties.layer == 'lines'
            })

            let points = data.filter((jsonFeature) => {
                return jsonFeature.properties.layer == 'points'
            }).map((jsonFeature) => {
                if (Boolean(jsonFeature.properties.roads_orientation)) {
                    jsonFeature.properties.roads_orientation = JSON.parse(jsonFeature.properties.roads_orientation)
                }
                return jsonFeature
            })

            if (osmIdsToStore.length > 0) {
                await storeOsmIdsInTile(tile_key, osmIdsToStore)
            }

            const graph = new RoadGraph();

            let extrudedBuildings: RetrieveBuilding;
            let extrudedPolygons: RetrieveProjected;
            let projectedLines: RetrieveProjected;
            let huggingLines: RetrieveHugging;
            let extrudedPoints: RetrievePoint;
            // console.log(buildings.length, polygons.length, lines.length, points.length)

            if (buildings.length > 0 && payload.excludeLayers.indexOf("buildings") == -1) {
                // if (buildings.length > 0 && false) {


                const index = new Flatbush(buildings.length);
                const flatIndexBuildingHeight = new Map<number, number>()
                const flatIndexOsmId = new Map<number, number>()
                for (let i = 0; i < buildings.length; i++) {
                    const buildingIndex = index.add(buildings[i].extent[0], buildings[i].extent[1], buildings[i].extent[2], buildings[i].extent[3]);
                    flatIndexBuildingHeight.set(buildingIndex, buildings[i].properties.buildingHeight)
                    flatIndexOsmId.set(buildingIndex, buildings[i].properties.osm_id)
                }
                index.finish();

                let result = await listElevation(buildings as Array<ElevationFeature>, payload.capabilities) as SourceFeature[];

                const extrudeResult: {
                    geometryAttribute: WireAttr[],
                    boundingBoxMinMax: [number, number, number, number, number, number]
                } = {
                    geometryAttribute: null,
                    boundingBoxMinMax: null
                }
                try {

                    const extruded = build3dBuildings(result, worldBuildingPosition, payload.skirtOffset, payload.outlineHeight)
                    extrudeResult.boundingBoxMinMax = extruded.boundingBoxMinMax
                    extrudeResult.geometryAttribute = formatBufferGeometryAttributes(extruded.geometriesJson)
                } catch (error) {
                    console.error(error)
                    // inflight.delete(id);
                    continue
                    // sendNoData(worker_id, tile.id)
                    // extruded = null
                }

                extrudedBuildings = {
                    type: "building",
                    z,
                    x,
                    y,
                    tile_key,
                    worldBuildingPosition,
                    features: result,
                    flatBushData: index.data,
                    flatIndexBuildingHeight,
                    flatIndexOsmId,
                    tileExtent: tile.tileExtent,
                    extrudeResult: extrudeResult
                }
            }

            if (polygons.length > 0 && payload.excludeLayers.indexOf("polygons") == -1) {
                const extrudeResult: {
                    geometryAttribute: WireAttr[],
                    boundingBoxMinMax: [number, number, number, number, number, number]
                } = {
                    geometryAttribute: null,
                    boundingBoxMinMax: null
                }


                let result_ = await listElevation(polygons as Array<ElevationFeature>, payload.capabilities, payload.defaultElevation) as SourceFeature[];
                const extruded = generateSurfaceGeometries(
                    result_,
                    worldBuildingPosition,
                    payload.segment,
                    tile.tileSize
                )
                // if (tile_key == "33811_23518") {
                //     console.log(`Temps extrude polygons : ${(performance.now() - t0).toFixed(2)} ms`, tile_key);
                // }

                if (Boolean(extruded)) {
                    extrudeResult.boundingBoxMinMax = extruded.boundingBoxMinMax
                    extrudeResult.geometryAttribute = formatBufferGeometryAttributes(extruded.geometriesJson)

                    // let thisTileResult: { building?: RetrieveBuilding, projected?: RetrieveProjected, id: number };

                    // if (tileResult[tile_key]) {
                    //     thisTileResult = tileResult[tile_key]
                    // } else {
                    //     thisTileResult = { id }
                    // }
                    extrudedPolygons = {
                        type: "projected",
                        z,
                        x,
                        y,
                        // id:payload.tile.id,
                        tile_key,
                        worldBuildingPosition,
                        //@ts-expect-error
                        features: polygons,
                        flatBushData: null,
                        flatIndexBuildingHeight: null,
                        flatIndexOsmId: null,
                        tileExtent: tile.tileExtent,
                        extrudeResult: extrudeResult
                    }
                    // tileResult[tile_key] = thisTileResult

                }


            }

            if (lines.length > 0 && payload.excludeLayers.indexOf("lines") == -1) {


                let result = await listElevation(lines as Array<ElevationFeature>, payload.capabilities, payload.defaultElevation);

                const sourceLineFeatures: SourceLineFeature[] = result.filter((line) => {
                    // if (line.properties.osm_id == 97855859) {
                    //     console.log(line, "sourceLineFeatures", 97855859)
                    // }
                    return line.geometryType == 'LineString' || line.geometryType == 'MultiLineString'
                }).map((line) => {

                    let geometry: LinesStringWithZ | MultiLineStringWithZ
                    if (line.geometryType === 'LineString') {
                        geometry = new LinesStringWithZ(line.flatCoordinates, 'XY', line.coordinates as any)
                    } else if (line.geometryType === 'MultiLineString') {
                        geometry = new MultiLineStringWithZ(line.flatCoordinates, 'XY', line.ends, line.coordinates as any)
                    }
                    const prop: SourceLineFeature = {
                        properties: line.properties as SurfaceVectorLineDescriptor,
                        geometry: geometry,
                        geometryType: line.geometryType
                    }
                    return prop

                })

                const extruded = generateLineGeometries(sourceLineFeatures, worldBuildingPosition, graph, payload.segment,
                    tile.tileSize)

                if (Boolean(extruded)) {
                    if (extruded.projectedGeometry) {
                        const extrudeResult: {
                            geometryAttribute: WireAttr[],
                            boundingBoxMinMax: [number, number, number, number, number, number]
                        } = {
                            geometryAttribute: null,
                            boundingBoxMinMax: null
                        }
                        extrudeResult.boundingBoxMinMax = extruded.projectedGeometry.boundingBoxMinMax
                        extrudeResult.geometryAttribute = formatBufferGeometryAttributes(extruded.projectedGeometry.geometriesJson)
                        projectedLines = {
                            type: "projected",
                            z,
                            x,
                            y,
                            // id:payload.tile.id,
                            tile_key,
                            worldBuildingPosition,
                            //@ts-expect-error
                            features: lines,
                            flatBushData: null,
                            flatIndexBuildingHeight: null,
                            flatIndexOsmId: null,
                            tileExtent: tile.tileExtent,
                            extrudeResult: extrudeResult
                        }
                    }
                    if (extruded.huggingGeometry) {
                        const extrudeResult: {
                            geometryAttribute: WireAttr[],
                            boundingBoxMinMax: [number, number, number, number, number, number]
                        } = {
                            geometryAttribute: null,
                            boundingBoxMinMax: null
                        }
                        extrudeResult.boundingBoxMinMax = extruded.huggingGeometry.boundingBoxMinMax
                        extrudeResult.geometryAttribute = formatBufferGeometryAttributes(extruded.huggingGeometry.geometriesJson)
                        huggingLines = {
                            type: "hugging",
                            z,
                            x,
                            y,
                            // id:payload.tile.id,
                            tile_key,
                            worldBuildingPosition,
                            //@ts-expect-error
                            features: lines,
                            flatBushData: null,
                            flatIndexBuildingHeight: null,
                            flatIndexOsmId: null,
                            tileExtent: tile.tileExtent,
                            extrudeResult: extrudeResult
                        }
                    }

                }
            }

            if (points.length > 0 && payload.excludeLayers.indexOf("points") == -1) {
                let result = await listElevation(points as Array<ElevationFeature>, payload.capabilities) as SourceFeature[];
                const extruded = createPointGeometries(
                    // @ts-expect-error
                    result,
                    worldBuildingPosition,
                    graph
                )

                if (Boolean(extruded)) {
                    extrudedPoints = {
                        type: "point",
                        z,
                        x,
                        y,
                        // id:payload.tile.id,
                        tile_key,
                        //@ts-ignore
                        features: points,
                        worldBuildingPosition,
                        tileExtent: tile.tileExtent,
                        boundingBoxMinMax: extruded.boundingBoxMinMax,
                        data: extruded.data
                    }
                }
            }

            // tileResult[tile_key] = { id }
            const thisTileResult: FeatureProcessResponse = { id: tile.id }

            if (extrudedBuildings) {
                thisTileResult.building = extrudedBuildings
            }
            if (extrudedPoints) {
                thisTileResult.point = extrudedPoints
            }

            if (extrudedPolygons && projectedLines) {
                thisTileResult.projected = [extrudedPolygons, projectedLines]
                // const newAttributes = mergeGeometryAttributes([extrudedPolygons.extrudeResult.geometryAttribute, extrudedLines.extrudeResult.geometryAttribute]);
                // const newBbox = mergeBoundingBox([extrudedPolygons.extrudeResult.boundingBoxMinMax, extrudedLines.extrudeResult.boundingBoxMinMax])
                // thisTileResult[tile_key].projected = {
                //     ...extrudedPolygons,
                //     extrudeResult: {
                //         geometryAttribute: newAttributes,
                //         boundingBoxMinMax: newBbox
                //     }
                // }
            } else if (extrudedPolygons) {

                thisTileResult.projected = [extrudedPolygons]

            } else if (projectedLines) {
                thisTileResult.projected = [projectedLines]
            }

            if (huggingLines) {
                thisTileResult.hugging = huggingLines
            }
            tileResult.push(thisTileResult)
            // console.log(tile_key)

            // const t1 = performance.now();
            // Temps écoulé : 164484.00 ms 33805_23527
            // if (t1 - t0 > 1000) {

            //     console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`, tile_key);
            // }

            // polygons = null
            // buildings = null
            // result = null


        } catch (e: any) {
            console.error(e)
        } finally {
            // inflight.delete(id);
        }
    }
    // const { id, url, z, x, y, tileExtent, tileBottomLeft } = tile;
    // const t1 = performance.now();
    // console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`);
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