import { TypedArray } from "three";
import Vec2 from "./vector2";
import Vec3 from "./vector3";

export function getPolygonCentroid(points: Vec2[]): Vec2 {
    //Correction for very small polygons:
    const x0 = points[0].x, y0 = points[0].y;

    let x = 0, y = 0, twiceArea = 0;
    let prev = points[points.length - 1];

    for (const next of points) {
        const x1 = prev.x - x0, y1 = prev.y - y0,
            x2 = next.x - x0, y2 = next.y - y0,
            a = x1 * y2 - x2 * y1;

        twiceArea += a;
        x += (x1 + x2) * a;
        y += (y1 + y2) * a;

        prev = next;
    }

    const factor = 3 * twiceArea;  // 6 * twiceArea/2
    x /= factor;
    y /= factor;

    return new Vec2(x + x0, y + y0);
}

export function isPointInsidePolygon(point: Vec2, vs: Vec2[]): boolean {
    // https://github.com/substack/point-in-polygon

    const { x, y } = point;

    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;

        const intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}
function getTriangleAreaSigned(p1: number[], p2: number[], p3: number[]): number {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
}

function isPointInTriangle(point: [number, number], triangle: [number, number][]): boolean {
    const [v1, v2, v3] = triangle;
    const d1 = getTriangleAreaSigned(point, v1, v2);
    const d2 = getTriangleAreaSigned(point, v2, v3);
    const d3 = getTriangleAreaSigned(point, v3, v1);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

function getIntersectionLineLine(
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
export function getIntersectionsLineTriangle(
    lineStart: [number, number], lineEnd: [number, number],
    triangle: [number, number][]
): [number, number][] {
    const intersectionPoints = [];

    for (let i = 0; i < triangle.length; i++) {
        const next = (i + 1 == triangle.length) ? 0 : i + 1;
        const ip = getIntersectionLineLine(lineStart, lineEnd, triangle[i], triangle[next]);

        if (ip) {
            intersectionPoints.push(ip);
        }
    }

    return intersectionPoints;
}

function orderConvexPolygonPoints(points: [number, number][]): [number, number][] {
    let mX = 0;
    let mY = 0;

    for (const point of points) {
        mX += point[0];
        mY += point[1];
    }

    mX /= points.length;
    mY /= points.length;

    const atanValues: Map<[number, number], number> = new Map();

    for (const point of points) {
        atanValues.set(point, Math.atan2(point[1] - mY, point[0] - mX));
    }

    points.sort((a, b) => {
        return atanValues.get(a) - atanValues.get(b);
    });

    return points;
}

export function findIntersectionTriangleTriangle(tri1: [number, number][], tri2: [number, number][]): [number, number][] {
    const clippedCorners: [number, number][] = [];

    const addPoint = (p1: [number, number]): void => {
        if (clippedCorners.some(p2 => p1[0] === p2[0] && p1[1] === p2[1])) {
            return;
        }

        clippedCorners.push(p1);
    }

    for (const point of tri1) {
        if (isPointInTriangle(point, tri2)) {
            addPoint(point);
        }
    }

    for (const point of tri2) {
        if (isPointInTriangle(point, tri1)) {
            addPoint(point);
        }
    }

    for (let i = 0, next = 1; i < tri1.length; i++, next = (i + 1 == tri1.length) ? 0 : i + 1) {
        const points = getIntersectionsLineTriangle(tri1[i], tri1[next], tri2);

        for (const point of points) {
            addPoint(point);
        }
    }

    return orderConvexPolygonPoints(clippedCorners);
}

export function getBarycentricCoordinatesOfPoint(point: Vec2, triangle: number[] | TypedArray): Vec3 {
    const a = new Vec2(triangle[0], triangle[1]);
    const b = new Vec2(triangle[2], triangle[3]);
    const c = new Vec2(triangle[4], triangle[5]);

    const v0 = Vec2.sub(b, a);
    const v1 = Vec2.sub(c, a);
    const v2 = Vec2.sub(point, a);

    const den = v0.x * v1.y - v1.x * v0.y;
    const v = (v2.x * v1.y - v1.x * v2.y) / den;
    const w = (v0.x * v2.y - v2.x * v0.y) / den;
    const u = 1 - v - w;
    if ((!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(w)) || (Number.isNaN(u) || Number.isNaN(v) || Number.isNaN(w))) {
        return new Vec3(1 / 3, 1 / 3, 1 / 3);

    }
    return new Vec3(u, v, w);
}