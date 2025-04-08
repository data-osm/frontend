import { MathUtils } from "three";
import { OMBBResult } from "../ombb-params";
import { BuildingRoofType, RoofType } from "../type";
import Vec2 from "../../math/vector2";
import Vec3 from "../../math/vector3";
import { StraightSkeletonResultPolygon } from "../tile3d-multipolygon";





var ON = 0;
var LEFT = 1;
var RIGHT = 2;
var ALMOST_ZERO = 0.00001;

export function angleClockwise(a: Vec2, b: Vec2): number {
    const dot = a.x * b.x + a.y * b.y;
    const det = a.x * b.y - a.y * b.x;
    return Math.atan2(det, dot);
}

export function normalizeAngle(angle: number): number {
    return (angle %= 2 * Math.PI) >= 0 ? angle : (angle + 2 * Math.PI);
}

export function signedDstToLine(point: Vec2, line: [Vec2, Vec2]): number {
    const lineVector = Vec2.sub(line[1], line[0]);
    const pointVector = Vec2.sub(point, line[0]);
    const cross = lineVector.x * pointVector.y - lineVector.y * pointVector.x;
    const lineLength = Math.hypot(lineVector.x, lineVector.y);

    return cross / lineLength;
}

export function calculateNormal(vA: Vec3, vB: Vec3, vC: Vec3): Vec3 {
    let cb = Vec3.sub(vB, vA);
    const ab = Vec3.sub(vC, vA);
    cb = Vec3.cross(cb, ab);
    return Vec3.normalize(cb);
}

export function calculateRoofNormals(vertices: number[], flip: boolean = false): number[] {
    const normals: number[] = [];

    for (let i = 0; i < vertices.length; i += 9) {
        const a = new Vec3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const b = new Vec3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
        const c = new Vec3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

        const normal = flip ?
            calculateNormal(c, b, a) :
            calculateNormal(a, b, c);
        const normalArray = Vec3.toArray(normal);

        for (let j = i; j < i + 9; j++) {
            normals[j] = normalArray[j % 3];
        }
    }

    return normals;
}

export function calculateSplitsNormals(splits: Vec2[]): Vec2[] {
    const splitNormals: Vec2[] = [];
    const edgeNormals: Vec2[] = [];

    for (let i = 0; i < splits.length - 1; i++) {
        const p0 = splits[i];
        const p1 = splits[i + 1];

        const edge = Vec2.sub(p1, p0);
        edgeNormals.push(Vec2.rotateLeft(edge));
    }

    for (let i = 0; i < splits.length; i++) {
        const edge0 = edgeNormals[i - 1];
        const edge1 = edgeNormals[i];

        if (!edge0) {
            splitNormals.push(Vec2.normalize(edge1));
            continue;
        }

        if (!edge1) {
            splitNormals.push(Vec2.normalize(edge0));
            continue;
        }

        const normal = Vec2.normalize(Vec2.add(edge0, edge1));
        splitNormals.push(normal);
    }

    return splitNormals;
}


export function getPointProgressAlongLineSegment(start: Vec2, end: Vec2, point: Vec2, clamp: boolean = true): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const dotProduct = ((point.x - start.x) * dx + (point.y - start.y) * dy);
    const progress = dotProduct / lengthSquared;

    if (!clamp) {
        return progress;
    }

    return MathUtils.clamp(progress, 0, 1);
}

export function splitPolygon(poly: Array<[number, number]>, rayOrig: [number, number], rayDir: [number, number]): Array<[number, number]>[] {
    if (!poly || poly.length < 3) {
        throw new Error("splitPolygon: input polygon must have at least 3 vertices");
    }

    const interPoints = [];

    let start = poly[poly.length - 1];
    for (let ivert = 0; ivert < poly.length; ivert++) {
        const end = poly[ivert];

        //inter = start + s * (end-start)
        //s = (rayOrig-start) dot (-rayDir.y, rayDir.x) / (end-start) dot (-rayDir.y, rayDir.x)
        //inter in edge if s>=0 && s<=1
        const edgeDir = [end[0] - start[0], end[1] - start[1]];
        const den = rayDir[0] * edgeDir[1] - rayDir[1] * edgeDir[0];
        if (den != 0) {
            let num = rayDir[0] * (rayOrig[1] - start[1]) - rayDir[1] * (rayOrig[0] - start[0]);
            const s = num / den;

            if (s >= 0 && s <= 1) {
                const p = [
                    start[0] + s * edgeDir[0],
                    start[1] + s * edgeDir[1]
                ];
                //inter = rayOrig + t * rayDir
                //t = det((end-start),(rayOrig-start)) / (end-start) dot (-rayDir.y, rayDir.x)
                num = edgeDir[0] * (rayOrig[1] - start[1]) - edgeDir[1] * (rayOrig[0] - start[0]);
                const t = num / den;
                interPoints.push({
                    is: (ivert + poly.length - 1) % poly.length,
                    ie: ivert,
                    p: p,
                    t: t
                });
            }

        }
        start = end;
    }

    //sort inter points by distance from the ray origin
    interPoints.sort(function (a, b) {
        if (a.t < b.t)
            return -1;
        if (a.t > b.t)
            return 1;
        return 0;
    });
    //	console.log(interPoints);

    if (interPoints.length % 2 !== 0)
        throw new Error("splitPolygon: unknown error");

    //list of new polygons with a first empty one (make it current)
    const output: Array<[number, number]>[] = [[]];
    let curPoly = output[0];

    //walk through initial poly points
    for (let ivert = 0; ivert < poly.length; ivert++) {
        //		console.log(ivert);
        //append first point to poly
        curPoly.push(poly[ivert]);

        //is there an intersection point ?
        let inter = null;
        for (let interTmp = 0; interTmp < interPoints.length; interTmp++) {
            if (interPoints[interTmp].is == ivert) {
                inter = interTmp;
                break;
            }
        }

        if (inter !== null) {
            //yes, add the inter point to the current poly
            // @ts-ignore
            curPoly.push(interPoints[inter].p);
            //set the paired inter point to be the crossback point of this poly
            if (inter % 2 == 0) {
                //				console.log("+1");
                // @ts-ignore
                interPoints[inter + 1].crossback = curPoly;
            } else {
                //				console.log("-1");
                // @ts-ignore
                interPoints[inter - 1].crossback = curPoly;
            }
            //now we have to switch the current poly to a pending one or to a new one
            // @ts-ignore
            if (interPoints[inter].crossback) {
                // @ts-ignore
                curPoly = interPoints[inter].crossback;
                //				console.log("a");
            } else {
                //				console.log("b");
                curPoly = [];
                output.push(curPoly);
            }
            //add the inter point to the new current
            // @ts-ignore
            curPoly.push(interPoints[inter].p);
        }

    }

    return output;
}

export function getIntersectionLineLine(
    l1p1: [number, number], l1p2: [number, number],
    l2p1: [number, number], l2p2: [number, number]
): [number, number] {
    const [x1, y1] = l1p1;
    const [x2, y2] = l1p2;
    const [x3, y3] = l2p1;
    const [x4, y4] = l2p2;

    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return null;
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // Lines are parallel
    if (denominator === 0) {
        return null;
    }

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return null;
    }

    const x = x1 + ua * (x2 - x1)
    const y = y1 + ua * (y2 - y1)

    return [x, y];
}

export function getNearestDirection(angle: number): number {

    const normalizedAngle = MathUtils.radToDeg(normalizeAngle(MathUtils.degToRad(angle)));

    if (normalizedAngle >= 45 && normalizedAngle < 135) {
        return 90;
    }

    if (normalizedAngle >= 135 && normalizedAngle < 225) {
        return 180;
    }

    if (normalizedAngle >= 225 && normalizedAngle < 315) {
        return 270;
    }

    return 0;
}

function GetSideOfLine(lineStart, lineEnd, point) {
    var d = (lineEnd.x - lineStart.x) * (point.y - lineStart.y) - (lineEnd.y - lineStart.y) * (point.x - lineStart.x);
    return (d > ALMOST_ZERO ? LEFT : (d < -ALMOST_ZERO ? RIGHT : ON));
}



// export function ExtentOfPoints(points: Vector2[]): [Vector2, Vector2, Vector2, Vector2] {
//     let collection = featureCollection(
//         points.map((p) => point([p.clone().x, p.clone().y]))
//     );
//     const boundingRect = smallestSurroundingRectangleByArea(collection);
//     const hull = concave(collection, { units: "meters" });

//     // if (hull) {
//     let box = bbox(hull)
//     // return [].concat.apply([], hull.geometry.coordinates).map((c)=>new Vector2(c[0],c[1]))
//     const concaveHull = CalcConvexHull(points)
//     console.log(
//         // box,
//         points,
//         [].concat.apply([], hull.geometry.coordinates),
//         ComputeOMBB(concaveHull),
//         // boundingRect,
//         // ComputeOMBB(CalcConvexHull(points).slice().map((v) => new Vector2(v.x / 10 + 300, v.y / 10 + 423))),
//         "flattern"
//     )
//     return [new Vector2(0, 0), new Vector2(box[0], box[1]), new Vector2(0, 0), new Vector2(box[2], box[3])]
//     // }

//     // throw Error("failed to generate bounding box")
// }






export function splitSkeletonPolygon(polygon: StraightSkeletonResultPolygon, splitAt: number): {
    verticesTop: number[];
    verticesBottom: number[];
} {
    const edgeLine: [Vec2, Vec2] = [polygon.edgeStart, polygon.edgeEnd];
    const edgeNormal = Vec2.normalize(Vec2.rotateRight(Vec2.sub(edgeLine[1], edgeLine[0])));
    const edgeOffset = Vec2.multiplyScalar(edgeNormal, -splitAt)
    const splitLine: [Vec2, Vec2] = [
        Vec2.add(edgeLine[0], edgeOffset),
        Vec2.add(edgeLine[1], edgeOffset)
    ];
    const verticesToSplit: [number, number][] = [];

    for (const vertex of polygon.vertices) {
        verticesToSplit.push([vertex.x, vertex.y]);
    }

    const verticesTop: number[] = [];
    const verticesBottom: number[] = [];
    let split: [number, number][][] = null;

    try {
        split = splitPolygon(
            verticesToSplit,
            Vec2.toArray(splitLine[0]),
            Vec2.toArray(Vec2.sub(splitLine[0], splitLine[1]))
        );
    } catch (e) {
    }

    if (!split || split.length === 1) {
        for (const vertex of polygon.vertices) {
            verticesBottom.push(vertex.x, vertex.y);
        }
    } else if (split.length > 1) {
        let flatDeep = (arr) => {
            return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val), []);
        };

        verticesBottom.push(...flatDeep(split[0]))
        verticesTop.push(...flatDeep(split[1]));
    }

    return {
        verticesTop,
        verticesBottom
    };
}

export function getPolygonAreaSigned(points: Vec2[]): number {
    let area = 0;
    let prev = points[points.length - 1];

    for (const next of points) {
        area += prev.x * next.y - next.x * prev.y;
        prev = next;
    }

    return Math.abs(area) / 2;
}

export function getTilesIntersectingLine(a: Vec2, b: Vec2): Vec2[] {
    let x = Math.floor(a.x);
    let y = Math.floor(a.y);
    const endX = Math.floor(b.x);
    const endY = Math.floor(b.y);

    const points: Vec2[] = [new Vec2(x, y)];

    if (x === endX && y === endY) {
        return points;
    }

    const stepX = Math.sign(b.x - a.x);
    const stepY = Math.sign(b.y - a.y);

    const toX = Math.abs(a.x - x - Math.max(0, stepX));
    const toY = Math.abs(a.y - y - Math.max(0, stepY));

    const vX = Math.abs(a.x - b.x);
    const vY = Math.abs(a.y - b.y);

    let tMaxX = toX === 0 ? 0 : (toX / vX);
    let tMaxY = toY === 0 ? 0 : (toY / vY);

    const tDeltaX = 1 / vX;
    const tDeltaY = 1 / vY;

    let i = 0;

    while (!(x === endX && y === endY) && i < 10000) {
        if (tMaxX <= tMaxY) {
            tMaxX = tMaxX + tDeltaX;
            x = x + stepX;
        } else {
            tMaxY = tMaxY + tDeltaY;
            y = y + stepY;
        }

        points.push(new Vec2(x, y));

        i++;
    }

    return points;
}


export function getTilesUnderTriangle(
    triangle: [number, number][],
    triangleScaleX: number,
    triangleScaleY: number,
    tileMinX: number = -Infinity,
    tileMinY: number = -Infinity,
    tileMaxX: number = Infinity,
    tileMaxY: number = Infinity
): Vec2[] {
    const sx = triangleScaleX;
    const sy = triangleScaleY;
    const pointA = new Vec2(triangle[0][0] * sx, triangle[0][1] * sy);
    const pointB = new Vec2(triangle[1][0] * sx, triangle[1][1] * sy);
    const pointC = new Vec2(triangle[2][0] * sx, triangle[2][1] * sy);

    const tilesA = getTilesIntersectingLine(pointA, pointB);
    const tilesB = getTilesIntersectingLine(pointB, pointC);
    const tilesC = getTilesIntersectingLine(pointC, pointA);

    const tilesOnEdges: Vec2[] = tilesA.concat(tilesB, tilesC);
    const tilesUnderTriangle: Vec2[] = [];

    let minY = Infinity;
    let maxY = -Infinity;
    let minX = 0;

    for (const tile of tilesOnEdges) {
        if (minY <= tile.y) {
            minX = Math.min(tile.x, minX);
        }

        minY = Math.min(tile.y, minY);
        maxY = Math.max(tile.y, maxY);
    }

    for (let y = minY; y <= maxY; y++) {
        let minX: number = Infinity;
        let maxX: number = -Infinity;

        for (const edgeTile of tilesOnEdges) {
            if (edgeTile.y === y) {
                minX = Math.min(minX, edgeTile.x);
                maxX = Math.max(maxX, edgeTile.x);
            }
        }

        for (let x = minX; x <= maxX; x++) {
            if (x < tileMinX || x > tileMaxX || y < tileMinY || y > tileMaxY) {
                continue;
            }

            tilesUnderTriangle.push(new Vec2(x, y));
        }
    }

    return tilesUnderTriangle;
}

export function getRotationVectorsFromOMBB(
    ombb: OMBBResult,
    orientation: 'along' | 'across',
    direction: number
): {
    origin: Vec2;
    rotVector0: Vec2;
    rotVector1: Vec2;
} {
    let ombbOrigin = ombb[0];
    let rotVector0 = Vec2.sub(ombb[3], ombbOrigin);
    let rotVector1 = Vec2.sub(ombb[1], ombbOrigin);

    if (typeof direction === 'number') {
        const currentAngle = Vec2.angleClockwise(new Vec2(1, 0), rotVector0);
        const rotation = getNearestDirection(direction - MathUtils.radToDeg(currentAngle));

        if (rotation !== 0) {
            let diff = rotation;

            if (diff < 0) {
                diff += 360;
            }

            const originIndex = Math.floor(diff / 90); // floor just to be sure
            const rotVector0Index = (originIndex + 3) % 4;
            const rotVector1Index = (originIndex + 1) % 4;

            ombbOrigin = ombb[originIndex];
            rotVector0 = Vec2.sub(ombb[rotVector0Index], ombbOrigin);
            rotVector1 = Vec2.sub(ombb[rotVector1Index], ombbOrigin);
        }
    } else if (typeof orientation === 'string') {
        const rotVector0Length = Vec2.getLength(rotVector0);
        const rotVector1Length = Vec2.getLength(rotVector1);

        if (
            (rotVector0Length > rotVector1Length && orientation === 'along') ||
            (rotVector0Length < rotVector1Length && orientation === 'across')
        ) {
            ombbOrigin = ombb[1];
            rotVector0 = Vec2.sub(ombb[0], ombbOrigin);
            rotVector1 = Vec2.sub(ombb[2], ombbOrigin);
        }
    }

    return {
        origin: ombbOrigin,
        rotVector0,
        rotVector1,
    };
}

export function getRoofTypeFromString(str: BuildingRoofType): RoofType {
    switch (str) {
        case 'flat':
            return RoofType.Flat;
        case 'gabled':
            return RoofType.Gabled;
        case 'gambrel':
            return RoofType.Gambrel;
        case 'hipped':
            return RoofType.Hipped;
        case 'pyramidal':
            return RoofType.Pyramidal;
        case 'onion':
            return RoofType.Onion;
        case 'dome':
            return RoofType.Dome;
        case 'round':
            return RoofType.Round;
        case 'skillion':
            return RoofType.Skillion;
        case 'mansard':
            return RoofType.Mansard;
        case 'quadrupleSaltbox':
            return RoofType.QuadrupleSaltbox;
        case 'saltbox':
            return RoofType.Saltbox;
    }

    console.error(`Roof type ${str} is not supported`);

    return RoofType.Flat;
}