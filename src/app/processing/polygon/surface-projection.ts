import { MathUtils, TypedArray } from "three";
import { getPointProgressAlongLineSegment, getTilesIntersectingLine, getTilesUnderTriangle, getTriangle } from "../building/roof/utils";
import Vec2 from "../math/vector2";
import { findIntersectionTriangleTriangle, getBarycentricCoordinatesOfPoint, getIntersectionsLineTriangle } from "../math/utils";
import Vec3 from "../math/vector3";


function triangulateConvex(vertices: [number, number][]): number[] {
    const result: number[] = [];

    if (vertices.length < 3) {
        return result;
    }

    for (let i = 2; i < vertices.length; i++) {
        result.push(0, i, i - 1);
    }

    return result;
}
function getIntersectingGroundTrianglesForLine(
    lineStart: Vec2,
    lineEnd: Vec2,
    segmentCount: number
): [number, number][][] {
    const groundTriangles: [number, number][][] = [];
    const tiles = getTilesIntersectingLine(
        Vec2.multiplyScalar(lineStart, segmentCount),
        Vec2.multiplyScalar(lineEnd, segmentCount)
    );

    for (const tilePos of tiles) {
        if (tilePos.x < 0 || tilePos.y < 0 || tilePos.x >= segmentCount || tilePos.y >= segmentCount) {
            continue;
        }

        groundTriangles.push(
            getTriangle(tilePos.x, tilePos.y, 0, segmentCount),
            getTriangle(tilePos.x, tilePos.y, 1, segmentCount)
        );
    }

    return groundTriangles;
}

export function projectLineSegment(
    {
        lineStart,
        lineEnd,
        tileSize,
        segmentCount,
        lineZ
    }: {
        lineStart: Vec2;
        lineEnd: Vec2;
        tileSize: number;
        segmentCount: number;
        lineZ: [number, number]
    }
): { vertices: Vec3[]; startProgress: number } {
    const lineStartNormalized = Vec2.multiplyScalar(lineStart, 1 / tileSize);
    const lineEndNormalized = Vec2.multiplyScalar(lineEnd, 1 / tileSize);

    const groundTriangles = getIntersectingGroundTrianglesForLine(
        lineStartNormalized,
        lineEndNormalized,
        segmentCount
    );

    if (groundTriangles.length === 0) {
        return { vertices: [], startProgress: 0 };
    }

    const pointsProgressSet: Set<number> = new Set();

    if (lineStartNormalized.x >= 0. && lineStartNormalized.x <= 1. && lineStartNormalized.y >= 0. && lineStartNormalized.y <= 1.) {
        pointsProgressSet.add(0);
    }
    if (lineEndNormalized.x >= 0. && lineEndNormalized.x <= 1. && lineEndNormalized.y >= 0. && lineEndNormalized.y <= 1.) {
        pointsProgressSet.add(1);
    }

    for (const triangle of groundTriangles) {
        const intersections = getIntersectionsLineTriangle(
            Vec2.toArray(lineStartNormalized),
            Vec2.toArray(lineEndNormalized),
            triangle
        );

        for (const intersectionPoint of intersections) {
            const progress = getPointProgressAlongLineSegment(
                lineStartNormalized,
                lineEndNormalized,
                new Vec2(intersectionPoint[0], intersectionPoint[1])
            );
            pointsProgressSet.add(progress);
        }
    }

    const pointsProgress = Array.from(pointsProgressSet).sort((a, b) => a - b);
    const lineVector = Vec2.sub(lineEnd, lineStart);

    return {
        vertices: pointsProgress.map(progress => {
            const z = MathUtils.lerp(lineZ[0], lineZ[1], progress);
            const pos = Vec2.add(lineStart, Vec2.multiplyScalar(lineVector, progress));
            return new Vec3(pos.x, pos.y, z);
        }),
        startProgress: pointsProgress[0]
    };
}


export function project(
    {
        triangle,
        attributes,
        triangleZ,
        tileSize,
        segment,
        height = 0
    }: {
        triangle: [number, number][];
        attributes: { [name: string]: [number, number][] };
        triangleZ: [number, number, number];
        tileSize: number,
        segment: number,
        height?: number;
    }
): {
    position: Float32Array;
    attributes: { [name: string]: Float32Array };
} {

    const segmentCount = segment;

    const triangleNormalized = normalizeTriangle(triangle, tileSize);
    const groundTriangles = getIntersectingGroundTrianglesForTriangle(triangleNormalized, segmentCount);
    const flatTriangle = triangleNormalized.reduce((acc, val) => acc.concat(val), []);
    const positionArrays: Float32Array[] = [];
    const attributeArrays: Map<string, Float32Array[]> = new Map();

    for (const name of Object.keys(attributes)) {
        attributeArrays.set(name, []);
    }
    // console.log("features", groundTriangles, isTriangleDegenerate(flatTriangle))

    if (isTriangleDegenerate(flatTriangle)) {
        return mergePositionsAndAttributes(positionArrays, attributeArrays);
    }

    for (let i = 0; i < groundTriangles.length; i++) {
        const polygon = findIntersectionTriangleTriangle(groundTriangles[i], triangleNormalized);

        if (polygon.length === 0) {
            continue;
        }

        const triangulated = triangulateConvex(polygon);
        const vertices = new Float32Array(triangulated.length * 3);
        const attributesBuffers: Map<string, Float32Array> = new Map();

        for (const name of Object.keys(attributes)) {
            attributesBuffers.set(name, new Float32Array(triangulated.length * 2));
        }

        for (let i = 0; i < triangulated.length; i++) {
            const index = triangulated[i];
            const x = polygon[index][0];
            const y = polygon[index][1];

            const bar = getBarycentricCoordinatesOfPoint(new Vec2(x, y), flatTriangle);
            const zInterp = triangleZ[0] * bar.x + triangleZ[1] * bar.y + triangleZ[2] * bar.z;


            vertices[i * 3] = x * tileSize;
            vertices[i * 3 + 1] = y * tileSize;
            vertices[i * 3 + 2] = zInterp + height;
            // vertices[i * 3 + 2] = 0 + height;

            for (const [name, attribute] of Object.entries(attributes)) {

                const buffer = attributesBuffers.get(name);

                buffer[i * 2] = attribute[0][0] * bar.x + attribute[1][0] * bar.y + attribute[2][0] * bar.z;
                buffer[i * 2 + 1] = attribute[0][1] * bar.x + attribute[1][1] * bar.y + attribute[2][1] * bar.z;
            }
        }

        positionArrays.push(vertices);

        for (const [name, buffer] of attributesBuffers.entries()) {
            attributeArrays.get(name).push(buffer);
        }
    }

    // const vertexCount = triangle.length;
    // const positionsOut = new Float32Array(vertexCount * 3);
    // // console.log(triangle, "triangle")
    // for (let i = 0; i < vertexCount; i++) {
    //     const xNorm = triangle[i][0];
    //     const yNorm = triangle[i][1];

    //     positionsOut[i * 3] = xNorm;
    //     positionsOut[i * 3 + 1] = yNorm;
    //     positionsOut[i * 3 + 2] = triangle[i][2] + height;
    // }


    // const attributesOut: { [name: string]: Float32Array } = {};

    // for (const [name, attribute] of Object.entries(attributes)) {

    //     const attrBuffer = new Float32Array(vertexCount * 2);

    //     for (let i = 0; i < vertexCount; i++) {
    //         attrBuffer[i * 2] = attribute[i][0];
    //         attrBuffer[i * 2 + 1] = attribute[i][1];
    //     }

    //     attributesOut[name] = attrBuffer;
    // }
    // return {
    //     position: positionsOut,
    //     attributes: attributesOut
    // };
    return mergePositionsAndAttributes(positionArrays, attributeArrays);
}

function normalizeTriangle(triangle: [number, number][], tileSize: number): [number, number][] {
    const normalized = triangle.map(vertex => [
        vertex[0] / tileSize,
        vertex[1] / tileSize,
    ]) as [number, number][]

    // const t = triangle.map(vertex => [
    //     vertex[0] / tileSize,
    //     vertex[1] / tileSize,
    // ]).filter((vertex) => {
    //     return !(vertex[0] >= 0 && vertex[0] <= 1 && vertex[1] >= 0 && vertex[1] <= 1)
    // })
    // if (t.length > 0) {
    //     console.log(t)

    // }

    return normalized
}



function getIntersectingGroundTrianglesForTriangle(triangle: [number, number][], segmentCount: number): [number, number][][] {
    const groundTriangles: [number, number][][] = [];
    const coveredTiles = getTilesUnderTriangle(
        triangle,
        segmentCount, segmentCount,
        0, 0,
        segmentCount - 1, segmentCount - 1
    );

    for (const tilePos of coveredTiles) {
        groundTriangles.push(
            getTriangle(tilePos.x, tilePos.y, 0, segmentCount),
            getTriangle(tilePos.x, tilePos.y, 1, segmentCount)
        );
    }

    return groundTriangles;
}

function isTriangleDegenerate(triangle: number[]): boolean {
    const a = new Vec2(triangle[0], triangle[1]);
    const b = new Vec2(triangle[2], triangle[3]);
    const c = new Vec2(triangle[4], triangle[4]);

    const v0 = Vec2.sub(b, a);
    const v1 = Vec2.sub(c, a);

    return v0.x * v1.y - v1.x * v0.y === 0;
}

function mergePositionsAndAttributes(
    positionArrays: Float32Array[],
    attributeArrays: Map<string, Float32Array[]>
): {
    position: Float32Array;
    attributes: { [name: string]: Float32Array };
} {
    const mergedAttributes: { [attributeName: string]: Float32Array } = {};

    for (const [name, buffers] of attributeArrays.entries()) {
        mergedAttributes[name] = mergeTypedArrays(Float32Array, buffers);
    }

    return {
        position: mergeTypedArrays(Float32Array, positionArrays),
        attributes: mergedAttributes
    };
}

function mergeTypedArrays<T extends TypedArray>(type: { new(l: number): T }, typedArrays: T[]): T {
    if (typedArrays.length > 0) {
        let length = 0;

        for (let i = 0; i < typedArrays.length; i++) {
            length += typedArrays[i].length;
        }

        const array = new type(length);

        let currentLength = 0;

        for (let i = 0; i < typedArrays.length; i++) {
            array.set(typedArrays[i], currentLength);
            currentLength += typedArrays[i].length;
        }

        return array;
    }

    return new type(0);
}