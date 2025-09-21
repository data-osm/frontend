/// <reference lib="webworker" />


import { Projection } from "ol/proj";
import { Coordinate, Feature, GeoJSON, Point } from "../../ol-module";
import { ElevationFeature } from "../elevation/pool";
import listElevation from "../elevation/listElevation";
import { getBottomLeft, Extent } from "ol/extent";
import { createXYZ, TileGrid } from "ol/tilegrid";
import { listBuildingHeight, TileIndexEntry } from "../building-elevation";
import Vec2 from "../math/vector2";
import Vec3 from "../math/vector3";
import { mergeFloat32 } from "../utils";
import { Box3 } from "three";
import { getUrl, loaderFn, xhr } from "../wfs-loader";
import { collectTransferables, PointFeatureByExtent, RequestPointProcessing } from "./type";



type PointFeature = Feature<Point>
let loader: loaderFn<PointFeature>
const format = new GeoJSON({ "featureProjection": "EPSG:4326", "featureClass": Feature })

// worker variables
const q: (() => Promise<void>)[] = [];
let running = 0;
let concurrency = 15;
let results: PointFeatureByExtent[] = [];
const MAX_BATCH_ITEMS = 30;

// global variables from main thread
let capabilities: string
let tilGrid: TileGrid = createXYZ({ tileSize: 512 })
let buffer: ArrayBuffer | undefined
let index: TileIndexEntry[] | undefined
let tileFlatIndexBuildingHeight: Map<string, Map<number, number>> | undefined


addEventListener('message', ({ data }) => {
    // console.log("message")
    const m: RequestPointProcessing = data.payload;
    capabilities = m.capabilities
    buffer = m.buildingBuffer
    index = m.buildingIndex
    tileFlatIndexBuildingHeight = m.tileFlatIndexBuildingHeight

    const worker_id = data.id
    const url = getUrl(m.data.baseUrl, m.data.identifiants)
    const projection = new Projection({ code: m.data.projection })
    loader = xhr(url, format);

    for (const extent of m.data.extents) {
        q.push(() => loadFeatures(extent, m.data.resolution, projection));
    }
    pump(worker_id);
})

function flushBatch(worker_id) {
    const payload = { requestId: worker_id, payload: { type: 'done', data: results } }
    postMessage(payload, collectTransferables(payload));
    results = []
}
function enqueueResult(worker_id) {

    if (results.length >= MAX_BATCH_ITEMS) {
        flushBatch(worker_id);
    }
}

function pump(worker_id) {
    while (running < concurrency && q.length) {
        startNext(worker_id);
    }
}

function startNext(worker_id) {
    running++;
    const task = q.shift()!;
    Promise.resolve()
        .then(task)
        .then(() => enqueueResult(worker_id))
        .catch((err) => {
            console.error(err)
            // log/ignore AbortError ici si besoin
            // if (err?.name !== 'AbortError') console.error(err);
        })
        .finally(() => {
            running--;
            pump(worker_id); // relance pour remplir le slot libre
            if (running === 0 && q.length === 0) {
                flushBatch(worker_id);

            }
        });
}

const loadFeatures = async function (extent: Extent, resolution: number, projection: Projection) {
    await loader(extent, resolution, projection).then(async (features) => {
        if (features.length === 0) return
        const featuresWithElevation = await addElevation(features)
        const positions = featuresWithElevation.map((feature) => {
            const coordinate = (feature.getGeometry() as Point).getCoordinates()
            return new Vec2(coordinate[0], coordinate[1])
        })

        let positionsWithElevation: Vec3[]
        if (buffer === undefined || index === undefined || tileFlatIndexBuildingHeight === undefined) {
            positionsWithElevation = positions.map((position) => new Vec3(position.x, position.y, 20))
        } else {
            positionsWithElevation = listBuildingHeight(tilGrid, buffer, index, tileFlatIndexBuildingHeight, positions)
        }

        const extentBottomLeftCoordinate = getBottomLeft(extent)
        const extentBottomLeft = new Vec2(extentBottomLeftCoordinate[0], extentBottomLeftCoordinate[1])
        const featuresByExtent = getAllFeaturesPerTile(featuresWithElevation, positionsWithElevation, extentBottomLeft, extent)
        onFinishWithSuccess(featuresByExtent, extentBottomLeftCoordinate)
    }).catch((error) => {
        onFinishWithError(extent)
        console.log(error)
    })


}

const onFinishWithSuccess = (features: PointFeatureByExtent, extentBottomLeftCoordinate: Coordinate) => {
    results.push(features)

}

const onFinishWithError = (extent) => {

}

const addElevation = async (features: PointFeature[]) => {
    const featuresForElevation: Array<ElevationFeature> = features.map((feature, index) => {
        const properties = feature.getProperties()
        delete properties["geometry"]
        return {
            "properties": properties,
            "center": (feature.getGeometry() as Point).getCoordinates(),
            "geometryType": "Point",
            "index": index
        }
    })
    let result = await listElevation(featuresForElevation, capabilities);
    result.map((featureWithElevation) => {
        const properties = features[featureWithElevation.index].getProperties()
        properties.elevation = featureWithElevation.properties.elevation
        // @ts-expect-error
        features[featureWithElevation.index].values_ = properties
    })
    return features
}

const getAllFeaturesPerTile = function (features: PointFeature[], positionsWithBuildingHeight: Array<Vec3>, extentBottomLeft: Vec2, extent: Extent): PointFeatureByExtent {

    const featureIds = []
    const osmIdsFeatureIndex = new Map<number, number>()
    const featureIndexOsmId = new Map<number, number>()

    const instancePositions: Array<Float32Array> = []
    const instanceStickPositions: Array<Float32Array> = []
    const instanceElevations: Array<Float32Array> = []
    const featuresProp: Array<{
        properties: { [key: string]: any },
        coordinate: Coordinate,
    }> = []

    for (let index = 0; index < features.length; index++) {
        const feature = features[index];
        const geometry = feature.getGeometry() as Point
        const properties = feature.getProperties()
        const coordinate = geometry.getCoordinates();

        delete properties["geometry"]
        const elevation = properties["elevation"]



        const instancePosition = new Float32Array(3);
        const instanceStickPosition = new Float32Array(4);
        const instanceElevation = new Float32Array(1);
        osmIdsFeatureIndex.set(properties["osm_id"], index + 1)
        featureIndexOsmId.set(index + 1, properties["osm_id"])
        featureIds.push(index + 1)

        featuresProp.push(
            {
                properties,
                coordinate
            }
        )

        instancePositions.push(
            instancePosition
        )

        instanceStickPositions.push(
            instanceStickPosition
        )
        instanceElevations.push(
            instanceElevation
        )

        let buildingHeightAtFeature = 20
        if (positionsWithBuildingHeight[index]) {
            buildingHeightAtFeature = positionsWithBuildingHeight[index].z * 1.5
        }


        instancePosition[0] = coordinate[0] - extentBottomLeft.x
        instancePosition[1] = coordinate[1] - extentBottomLeft.y
        instancePosition[2] = buildingHeightAtFeature + elevation

        instanceStickPosition[0] = coordinate[0] - extentBottomLeft.x
        instanceStickPosition[1] = coordinate[1] - extentBottomLeft.y
        instanceStickPosition[2] = 0
        instanceStickPosition[3] = buildingHeightAtFeature + elevation

        instanceElevation[0] = elevation

    }
    const positions = mergeFloat32(instancePositions)
    const boundingBox = new Box3().setFromArray(positions)
    boundingBox.expandByScalar(20)


    const pointTileFeaturesMap: PointFeatureByExtent = {
        features: featuresProp,
        instancePositions: positions,
        instanceStickPositions: mergeFloat32(instanceStickPositions),
        instanceElevations: mergeFloat32(instanceElevations),
        featureIds: new Int32Array(featureIds),
        osmIdsFeatureIndex: osmIdsFeatureIndex,
        featureIndexOsmId: featureIndexOsmId,
        boundingBoxMinMax: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z, boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
        tileBottomLeft: [extentBottomLeft.x, extentBottomLeft.y],
        extent: extent
    }


    return pointTileFeaturesMap
}
export { };