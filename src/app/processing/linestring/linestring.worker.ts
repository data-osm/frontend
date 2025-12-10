/// <reference lib="webworker" />

import { createXYZ, TileGrid } from "ol/tilegrid";
import { getUrl, loaderFn, xhr } from "../wfs-loader";
import { Coordinate, Feature, FeatureLike, GeoJSON, LineString, MultiLineString, Point } from "../../ol-module";
import { Extent, getBottomLeft, getCenter } from "ol/extent";
import { Projection } from "ol/proj";
import { ElevationFeature, GeometryType } from "../elevation/pool";
import listElevation from "../elevation/listElevation";
import RenderFeature, { toGeometry } from "ol/render/Feature";
import Vec2 from "../math/vector2";
import Vec3 from "../math/vector3";
import { createPositionBuffer, ensureLinesAreClosed } from "./utils";
import { LineFeatureByExtent, RequestLineProcessing, TypeLineProcessingTool } from "./type";
import { BufferAttribute, BufferAttributeJSON, BufferGeometry, CatmullRomCurve3, Color, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { collectTransferables } from "../points/type";

import { projectAndAddGeometry, RoadBuilder } from "./line-builder";
import { LinesStringWithZ, MultiLineStringWithZ } from "../utils";
import { formatBufferGeometryAttributes } from "../building-processing-worker/worker-packer";




type LineFeature = Feature<LineString | MultiLineString>
type LineFeatureWithZ = Feature<LinesStringWithZ | MultiLineStringWithZ>

let loader: loaderFn<LineFeature>
const format = new GeoJSON({ "featureProjection": "EPSG:4326", "featureClass": Feature })

// worker variables
const q: (() => Promise<void>)[] = [];
let running = 0;
let concurrency = 15;
let results: LineFeatureByExtent[] = [];
const MAX_BATCH_ITEMS = 30;

// global variables from main thread
let capabilities: string

let filterFeatureCondition: (properties: { [x: string]: any; }) => boolean
let getPointTileGroupByFromFeature: (properties: { [x: string]: any; }) => string
let groupFeatureBy: (properties: { [x: string]: any; }) => { "color": string, [key: string]: any }
let getFeatureRadius: (properties: { [key: string]: any }) => number
let getFeatureId: (properties: { [key: string]: any }) => number
let onGeometryCreated: (geometry: BufferGeometry, properties: { [key: string]: any }) => void = () => { }


addEventListener('message', ({ data }) => {


    const m: RequestLineProcessing = data.payload;

    filterFeatureCondition = fromMethodShorthand(m.filterFeatureCondition)
    getPointTileGroupByFromFeature = fromMethodShorthand(m.getPointTileGroupByFromFeature)
    groupFeatureBy = fromMethodShorthand(m.groupFeatureBy)
    getFeatureRadius = fromMethodShorthand(m.getFeatureRadius)
    getFeatureId = fromMethodShorthand(m.getFeatureId)
    onGeometryCreated = fromMethodShorthand(m.onGeometryCreated)

    capabilities = m.capabilities


    const worker_id = data.id
    const url = getUrl(m.data.baseUrl, m.data.identifiants)
    const projection = new Projection({ code: m.data.projection })
    loader = xhr(url, format);

    for (const extent of m.data.extents) {
        q.push(() => loadFeatures(extent, m.data.resolution, projection, m.lineProcessingTool));
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

const loadFeatures = async function (extent: Extent, resolution: number, projection: Projection, lineProcessingTool: TypeLineProcessingTool) {
    await loader(extent, resolution, projection).then(async (features) => {
        if (features.length === 0) return
        features = features.filter((f) => filterFeatureCondition(f.getProperties()))
        ensureLinesAreClosed(features)

        const featuresWithElevation = await addElevation(features)
        const extentBottomLeftCoordinate = getBottomLeft(extent)
        const extentBottomLeft = new Vec2(extentBottomLeftCoordinate[0], extentBottomLeftCoordinate[1])

        const featuresByExtent = getAllTFeaturesPerTile(featuresWithElevation, extentBottomLeft, extent, lineProcessingTool)
        onFinishWithSuccess(featuresByExtent, extentBottomLeftCoordinate)
    }).catch((error) => {
        onFinishWithError(extent)
        console.log(error)
    })


}

const onFinishWithSuccess = (features: LineFeatureByExtent[], extentBottomLeftCoordinate: Coordinate) => {
    results.push(...features)

}

const onFinishWithError = (extent) => {

}

const addElevation = async (features: LineFeature[]) => {
    const featureForElevation: ElevationFeature[] = features.map((feature, index) => {
        const properties = feature.getProperties()
        delete properties["geometry"]

        return {
            "properties": properties,
            "geometryType": feature.getGeometry().getType() as GeometryType,
            "coordinates": feature.getGeometry().getCoordinates(),
            "index": index
        }
    })

    let result = await listElevation(featureForElevation, capabilities);
    result.map((featureWithElevation) => {
        const feature = features[featureWithElevation.index]
        const geometry = feature.getGeometry()
        let geometryWithZ: LinesStringWithZ | MultiLineStringWithZ
        if (geometry instanceof LineString) {
            geometryWithZ = new LinesStringWithZ(geometry.getCoordinates(), geometry.getLayout(), featureWithElevation.coordinates as Array<[number, number, number]>)
        } else if (geometry instanceof MultiLineString) {
            geometryWithZ = new MultiLineStringWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEnds(), featureWithElevation.coordinates as Array<[number, number, number]>[])
        }
        feature.setGeometry(geometryWithZ)
    })
    return features as LineFeatureWithZ[]
}

const getAllTFeaturesPerTile = function (features: LineFeatureWithZ[], extentBottomLeft: Vec2, extent: Extent, lineProcessingTool: TypeLineProcessingTool) {
    const tiles: LineFeatureByExtent[] = []

    const getFeatureTile = function (prefixKey: string): LineFeatureByExtent {
        let tile: LineFeatureByExtent
        tile = tiles.find((tile) => tile.prefixKey === prefixKey)
        if (!tile) {
            // console.log(prefixKey)
            tile = {
                extentBottomLeft: Vec2.toArray(extentBottomLeft),
                prefixKey: prefixKey,
                group: { color: "gray" },
                features: [],
                instancePositions: [],
                finalGeometryJson: undefined,
                boundingBoxMinMax: undefined,
                osmIdsFeatureIndex: undefined,
                featureIndexOsmId: undefined,
                geometryIndex: undefined
            }
            tiles.push(tile)
        }
        return tile
    }
    for (let index = 0; index < features.length; index++) {
        const feature = features[index];
        const properties = feature.getProperties()
        delete properties["geometry"]
        const prefixKey = getPointTileGroupByFromFeature(properties)
        const lineTile = getFeatureTile(prefixKey)
        if (lineTile.features.length === 0) {
            const prop = groupFeatureBy(properties)
            lineTile.group = { ...prop, color: prop["color"] }
        }
        const geometry = feature.getGeometry()
        const geometryExtent = geometry.getExtent()
        properties.geometryExtent = geometryExtent
        //@ts-ignore
        lineTile.features.push(properties)

        let coordinates: Array<[number, number, number]> = [];
        if (geometry instanceof LinesStringWithZ) {
            coordinates = geometry.coordinatesWithZ
        } else if (geometry instanceof MultiLineStringWithZ) {
            coordinates = geometry.coordinatesWithZ.reduce((acc, val) => acc.concat(val), [])
        }

        const instancePosition = createPositionBuffer(
            coordinates,
            {
                ignoreZ: false,
                origin: new Vector3(extentBottomLeft.x, extentBottomLeft.y, -3),
            }
        )
        lineTile.instancePositions.push(instancePosition)
    }

    tiles.forEach((tile) => {
        if (lineProcessingTool === "tube") {
            computeTubeGeometryPositions(tile)
        } else {
            computeFlatGeometryPositions(tile)
        }
    })

    return tiles
}

const computeTubeGeometryPositions = function (tile: LineFeatureByExtent) {
    const osmIdsFeatureIndex = new Map<number, number>()
    const featureIndexOsmId = new Map<number, number>()

    const tubeGeometries = tile.instancePositions.map((instancePosition, index) => {


        const points: Array<Vector3> = []
        const featureProperties = tile.features[index]
        const featureID = getFeatureId(featureProperties)
        const featureIndex = index + 1
        osmIdsFeatureIndex.set(featureID, featureIndex)
        featureIndexOsmId.set(featureIndex, featureID)

        const featureRadius = getFeatureRadius(featureProperties)

        for (let i = 0; i < instancePosition.length; i += 3) {
            points.push(
                new Vector3(
                    instancePosition[i],
                    instancePosition[i + 1],
                    instancePosition[i + 2]
                )
            )
        }

        const path = new CatmullRomCurve3(points, false)
        const tubeGeometry = new TubeGeometry(path, 64, featureRadius, 8 * 2, false)

        // Get the 'uv' attribute from the geometry
        const uvAttribute = tubeGeometry.attributes.uv;

        // Create the visibility attribute
        const featureUid = new Int32Array(uvAttribute.count)

        for (let i = 0; i < uvAttribute.count; i++) {
            featureUid[i] = featureIndex
        }

        tubeGeometry.setAttribute('aFeatureUid', new BufferAttribute(featureUid, 1));
        onGeometryCreated(tubeGeometry, featureProperties)

        return tubeGeometry
    })
    const finalGeometry = mergeGeometries(tubeGeometries)
    finalGeometry.computeBoundingBox()
    finalGeometry.computeBoundingSphere()

    const finalGeometryJson = Object.keys(finalGeometry.attributes).map((key) => {

        return {
            "key": key,
            "data": finalGeometry.attributes[key].toJSON() as BufferAttributeJSON
        }
    })
    const box = finalGeometry.boundingBox
    const boundingBoxMinMax = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
    tile.finalGeometryJson = formatBufferGeometryAttributes(finalGeometryJson)
    tile.boundingBoxMinMax = boundingBoxMinMax
    tile.osmIdsFeatureIndex = osmIdsFeatureIndex
    tile.featureIndexOsmId = featureIndexOsmId
    tile.geometryIndex = finalGeometry.index


}

const computeFlatGeometryPositions = function (tile: LineFeatureByExtent) {
    const osmIdsFeatureIndex = new Map<number, number>()
    const featureIndexOsmId = new Map<number, number>()

    const geometries: Array<BufferGeometry> = []

    for (let index = 0; index < tile.instancePositions.length; index++) {
        const featureIndex = index + 1
        const featureProperties = tile.features[index]
        const featureID = getFeatureId(featureProperties)
        osmIdsFeatureIndex.set(featureID, featureIndex)
        featureIndexOsmId.set(featureIndex, featureID)

        const length = tile.instancePositions[index].length - 3;
        const point = new Float32Array(2 * length);
        const vertices: Array<Vec3> = []
        for (let i = 0; i < length; i += 3) {

            point[2 * i] = tile.instancePositions[index][i];
            point[2 * i + 1] = tile.instancePositions[index][i + 1];
            point[2 * i + 2] = tile.instancePositions[index][i + 2];

            point[2 * i + 3] = tile.instancePositions[index][i + 3];
            point[2 * i + 4] = tile.instancePositions[index][i + 4];
            point[2 * i + 5] = tile.instancePositions[index][i + 5];

            const p1 = new Vec3(
                point[2 * i],
                point[2 * i + 1],
                point[2 * i + 2]
            )
            const p2 = new Vec3(
                point[2 * i + 3],
                point[2 * i + 4],
                point[2 * i + 5]
            )
            vertices.push(p1, p2)

        }
        const roadBuffer = new RoadBuilder().build(
            {
                vertices: vertices,
                width: 4.368129562747236,
                uvFollowRoad: true,
                uvScaleY: 4.368129562747236 * 4,
                vertexAdjacentToStart: vertices[0].xy,
                vertexAdjacentToEnd: vertices[vertices.length - 1].xy,

            }
        )

        const roadProjectedGeometry = projectAndAddGeometry({
            position: roadBuffer.position,
            uv: roadBuffer.uv,
            textureId: 1,
        })

        // console.log(roadProjectedGeometry.positionBuffer, "roadProjectedGeometry.positionBuffer");
        const geometry = new BufferGeometry()
        geometry.setAttribute("position", new BufferAttribute(roadProjectedGeometry.positionBuffer, 3))
        geometry.setAttribute("normal", new BufferAttribute(roadProjectedGeometry.normalBuffer, 3))
        geometry.setAttribute("uv", new BufferAttribute(roadProjectedGeometry.uvBuffer, 2))

        const uvAttribute = geometry.attributes.uv;

        // Create the visibility attribute
        const featureUid = new Int32Array(uvAttribute.count)

        for (let i = 0; i < uvAttribute.count; i++) {
            featureUid[i] = featureIndex
        }
        geometry.setAttribute('aFeatureUid', new BufferAttribute(featureUid, 1));

        geometries.push(geometry)

    }

    const finalGeometry = mergeGeometries(geometries)
    finalGeometry.computeBoundingBox()
    finalGeometry.computeBoundingSphere()
    const finalGeometryJson = Object.keys(finalGeometry.attributes).map((key) => {

        return {
            "key": key,
            "data": finalGeometry.attributes[key].toJSON()
        }
    })


    const box = finalGeometry.boundingBox
    const boundingBoxMinMax = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
    tile.finalGeometryJson = formatBufferGeometryAttributes(finalGeometryJson)
    tile.boundingBoxMinMax = boundingBoxMinMax
    tile.osmIdsFeatureIndex = osmIdsFeatureIndex
    tile.featureIndexOsmId = featureIndexOsmId
    tile.geometryIndex = finalGeometry.index

}

function fromMethodShorthand(src): any {
    const m = src.match(/^\s*([\w$]+)\s*\(([^)]*)\)\s*{([\s\S]*)}\s*$/);
    if (!m) throw new Error('Format inattendu');
    const params = m[2];
    const body = m[3];
    return new Function(params, body);
}