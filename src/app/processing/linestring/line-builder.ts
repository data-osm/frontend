import { BufferAttribute, BufferGeometry, Group, MathUtils, Points } from "three";
import Vec2 from "../math/vector2";
import { LineGeometry, LineMaterial, LineSegments2 } from "three/examples/jsm/Addons";
import Vec3 from "../math/vector3";

export enum RoadSide {
    Both,
    Left,
    Right
}

export class RoadBuilder {
    constructor(
    ) {
    }
    controlPoints: Vec3[][];
    public build(
        {
            vertices,
            vertexAdjacentToStart,
            vertexAdjacentToEnd,
            width,
            uvFollowRoad,
            uvScale = 1,
            uvScaleY = 1,
            side = RoadSide.Both,
            uvMinX = 0,
            uvMaxX = 1,
        }: {
            vertices: Vec3[];
            vertexAdjacentToStart?: Vec2;
            vertexAdjacentToEnd?: Vec2;
            width: number;
            uvFollowRoad: boolean;
            uvScale?: number;
            uvScaleY?: number;
            side?: RoadSide;
            uvMinX?: number;
            uvMaxX?: number;
        }
    ): { position: number[]; uv: number[]; border: Vec3[] } {

        const isClosed = vertices[0].equals(vertices[vertices.length - 1]);
        const points = [...vertices];

        if (isClosed) {
            points.pop();
        }



        const controlPoints = this.getControlPoints(points, isClosed, width, vertexAdjacentToStart, vertexAdjacentToEnd);
        this.controlPoints = controlPoints;
        const border = this.getBorderVertices(controlPoints, isClosed);

        const geometry = this.buildSegmentsFromControlPoints(
            controlPoints,
            isClosed,
            uvScaleY,
            uvMinX,
            uvMaxX,
            side,
            // height
        );

        if (!uvFollowRoad) {
            this.fillUVsFromPositions(geometry.uv, geometry.position, uvScale);
        }

        return {
            position: geometry.position,
            uv: geometry.uv,
            border: border
        };
    }

    // private  ensureSmoothConnection(pointA: Vec2, pointB: Vec2, epsilon: number = 0.001): Vec2 {

    //     if ((Math.abs(pointA.x - pointB.x) < epsilon && Math.abs(pointA.y - pointB.y) < epsilon)) {
    //         // Make sure the points are exactly the same if they are close enough
    //         console.log("ici")
    //         return new Vec2(pointA.x, pointA.y);
    //     }
    //     return pointB;
    // }

    private getBorderVertices(controlPoints: Vec3[][], isClosed: boolean): Vec3[] {
        const segmentCount = controlPoints.length - (isClosed ? 0 : 1);
        const border: Vec3[] = [];

        for (let i = 0; i < segmentCount; i++) {
            const current = controlPoints[i];
            const next = controlPoints[(i + 1) % controlPoints.length];

            if (current[4]) {
                const inverse = current[2].equals(current[0]);

                if (inverse) {
                    border.unshift(current[4]);
                } else {
                    border.push(current[4]);
                }
            }

            border.push(current[0], next[2]);
            border.unshift(next[3], current[1]);
        }

        border.push(border[0]);

        return border;
    }

    private buildConnectionAttributesStart(
        controlPoint: Vec3[],
        side: RoadSide,
        start: number,
        end: number,
        isInverse: boolean,
        uvMinX: number,
        uvMaxX: number,
        uvScaleY: number,
        position: number[],
        uv: number[],
        // height
    ): void {
        if (side === RoadSide.Both) {
            const c0uv = [uvMinX, end / uvScaleY];
            const c1uv = [uvMaxX, end / uvScaleY];
            const c4uv = [isInverse ? uvMaxX : uvMinX, start / uvScaleY];

            position.push(
                controlPoint[0].x, controlPoint[0].y, controlPoint[0].z,
                controlPoint[1].x, controlPoint[1].y, controlPoint[1].z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
            );
            uv.push(
                ...c0uv,
                ...c1uv,
                ...c4uv
            );

            return;
        }

        const uvMidX = (uvMinX + uvMaxX) / 2;
        // const midEnd = Vec2.multiplyScalar(Vec2.add(controlPoint[0].xy, controlPoint[1].xy), 0.5);
        const midEnd = Vec3.multiplyScalar(Vec3.add(controlPoint[0], controlPoint[1]), 0.5);

        // const midCenter = isInverse ?
        //     Vec2.multiplyScalar(Vec2.add(controlPoint[2].xy, controlPoint[4].xy), 0.5) :
        //     Vec2.multiplyScalar(Vec2.add(controlPoint[1].xy, controlPoint[4].xy), 0.5);
        const midCenter = isInverse ?
            Vec3.multiplyScalar(Vec3.add(controlPoint[2], controlPoint[4]), 0.5) :
            Vec3.multiplyScalar(Vec3.add(controlPoint[1], controlPoint[4]), 0.5);

        const midEndUV = [uvMidX, end / uvScaleY];
        const midCenterUV = [uvMidX, ((start + end) / 2) / uvScaleY];

        const c0uv = [uvMinX, end / uvScaleY];
        const c1uv = [uvMaxX, end / uvScaleY];
        const c4uv = [isInverse ? uvMaxX : uvMinX, start / uvScaleY];

        const clipLeft = side === RoadSide.Left;

        if (clipLeft === isInverse) {
            position.push(
                midCenter.x, midCenter.y, midCenter.z,
                midEnd.x, midEnd.y, midEnd.z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
            );
            const t2 = !isInverse ? controlPoint[0] : controlPoint[1];
            const t2uv = !isInverse ? c0uv : c1uv;
            position.push(
                midEnd.x, midEnd.y, midEnd.z,
                t2.x, t2.y, t2.z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
            );

            uv.push(
                ...midCenterUV,
                ...midEndUV,
                ...c4uv,

                ...midEndUV,
                ...t2uv,
                ...c4uv
            );
        } else {
            const t = !isInverse ? controlPoint[1] : controlPoint[0];
            const tuv = !isInverse ? c1uv : c0uv;
            position.push(
                midCenter.x, midCenter.y, midCenter.z,
                t.x, t.y, t.z,
                midEnd.x, midEnd.y, midEnd.z,
            );
            uv.push(
                ...midCenterUV,
                ...tuv,
                ...midEndUV
            );
        }
    }

    private buildConnectionAttributesEnd(
        controlPoint: Vec3[],
        side: RoadSide,
        start: number,
        end: number,
        isInverse: boolean,
        uvMinX: number,
        uvMaxX: number,
        uvScaleY: number,
        position: number[],
        uv: number[],
        // height: number,
    ): void {
        if (side === RoadSide.Both) {
            const c2uv = [uvMinX, start / uvScaleY];
            const c3uv = [uvMaxX, start / uvScaleY];
            const c4uv = [isInverse ? uvMaxX : uvMinX, end / uvScaleY];

            position.push(
                controlPoint[2].x, controlPoint[2].y, controlPoint[2].z,
                controlPoint[3].x, controlPoint[3].y, controlPoint[3].z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
            );
            uv.push(
                ...c2uv,
                ...c3uv,
                ...c4uv
            );

            return;
        }

        const uvMidX = (uvMinX + uvMaxX) / 2;
        const midStart = Vec3.multiplyScalar(Vec3.add(controlPoint[2], controlPoint[3]), 0.5);
        // const midStart = Vec2.multiplyScalar(Vec2.add(controlPoint[2].xy, controlPoint[3].xy), 0.5);
        // const midCenter = isInverse ?
        //     Vec2.multiplyScalar(Vec2.add(controlPoint[2].xy, controlPoint[4].xy), 0.5) :
        //     Vec2.multiplyScalar(Vec2.add(controlPoint[1].xy, controlPoint[4].xy), 0.5);

        const midCenter = isInverse ?
            Vec3.multiplyScalar(Vec3.add(controlPoint[2], controlPoint[4]), 0.5) :
            Vec3.multiplyScalar(Vec3.add(controlPoint[1], controlPoint[4]), 0.5);

        const midStartUV = [uvMidX, start / uvScaleY];
        const midCenterUV = [uvMidX, ((start + end) / 2) / uvScaleY];

        const c2uv = [uvMinX, start / uvScaleY];
        const c3uv = [uvMaxX, start / uvScaleY];
        const c4uv = [isInverse ? uvMaxX : uvMinX, end / uvScaleY];

        const clipLeft = side === RoadSide.Left;

        if (clipLeft === isInverse) {
            position.push(
                midStart.x, midStart.y, midStart.z,
                midCenter.x, midCenter.y, midCenter.z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
            );
            const t1 = !isInverse ? controlPoint[2] : controlPoint[3];
            const t1uv = !isInverse ? c2uv : c3uv;
            position.push(
                midStart.x, midStart.y, midStart.z,
                controlPoint[4].x, controlPoint[4].y, controlPoint[4].z,
                t1.x, t1.y, t1.z,
            );

            uv.push(
                ...midStartUV,
                ...midCenterUV,
                ...c4uv,

                ...midStartUV,
                ...c4uv,
                ...t1uv
            );
        } else {
            const t = !isInverse ? controlPoint[3] : controlPoint[2];
            const tuv = !isInverse ? c3uv : c2uv;
            position.push(
                midStart.x, midStart.y, midStart.z,
                t.x, t.y, t.z,
                midCenter.x, midCenter.y, midCenter.z,
            );

            uv.push(
                ...midStartUV,
                ...tuv,
                ...midCenterUV,
            );
        }
    }

    private buildConnection(
        controlPoint: Vec3[],
        side: RoadSide,
        uvProgress: number,
        uvMinX: number,
        uvMaxX: number,
        uvScaleY: number,
        position: number[],
        uv: number[],
        // height: number,
        type: 'start' | 'end'
    ): number {
        if (!controlPoint[4]) {
            return uvProgress;
        }

        const isInverse = controlPoint[2].equals(controlPoint[0]);
        const triLength = Vec2.getLength(Vec2.sub(controlPoint[4].xy, !isInverse ? controlPoint[0].xy : controlPoint[1].xy));

        const start = uvProgress;
        const end = start + triLength;

        if (type === 'start') {
            this.buildConnectionAttributesStart(
                controlPoint,
                side,
                start,
                end,
                isInverse,
                uvMinX,
                uvMaxX,
                uvScaleY,
                position,
                uv,
                // height
            );
        } else {
            this.buildConnectionAttributesEnd(
                controlPoint,
                side,
                start,
                end,
                isInverse,
                uvMinX,
                uvMaxX,
                uvScaleY,
                position,
                uv,
                // height
            );
        }

        return end;
    }

    private buildSegment(
        controlPointFrom: Vec3[],
        controlPointTo: Vec3[],
        side: RoadSide,
        uvProgress: number,
        uvMinX: number,
        uvMaxX: number,
        uvScaleY: number,
        position: number[],
        uv: number[],
        // height: number,
    ): number {
        const a = controlPointFrom[0];
        const b = controlPointFrom[1];
        const c = controlPointTo[2];
        const d = controlPointTo[3];

        const segmentLength = Vec2.getLength(Vec2.sub(a.xy, c.xy));
        const uvStart = uvProgress;
        const uvEnd = uvProgress + segmentLength;

        if (side === RoadSide.Both) {
            position.push(
                a.x, a.y, a.z,
                b.x, b.y, b.z,
                c.x, c.y, c.z,
            );
            position.push(
                b.x, b.y, b.z,
                d.x, d.y, d.z,
                c.x, c.y, c.z,
            );

            uv.push(
                uvMinX, uvStart / uvScaleY,
                uvMaxX, uvStart / uvScaleY,
                uvMinX, uvEnd / uvScaleY
            );
            uv.push(
                uvMaxX, uvStart / uvScaleY,
                uvMaxX, uvEnd / uvScaleY,
                uvMinX, uvEnd / uvScaleY
            );
        } else {
            // const midStart = Vec2.multiplyScalar(Vec2.add(c.xy, d.xy), 0.5);
            const midStart = Vec3.multiplyScalar(Vec3.add(c, d), 0.5);
            // const midEnd = Vec2.multiplyScalar(Vec2.add(a.xy, b.xy), 0.5);
            const midEnd = Vec3.multiplyScalar(Vec3.add(a, b), 0.5);
            const uvMidX = (uvMinX + uvMaxX) / 2;

            if (side === RoadSide.Left) {
                position.push(
                    b.x, b.y, b.z,
                    midEnd.x, midEnd.y, midEnd.z,
                    d.x, d.y, d.z,
                );
                position.push(
                    midEnd.x, midEnd.y, midEnd.z,
                    midStart.x, midStart.y, midStart.z,
                    d.x, d.y, d.z,
                );

                uv.push(
                    uvMaxX, uvStart / uvScaleY,
                    uvMidX, uvStart / uvScaleY,
                    uvMaxX, uvEnd / uvScaleY
                );
                uv.push(
                    uvMidX, uvStart / uvScaleY,
                    uvMidX, uvEnd / uvScaleY,
                    uvMaxX, uvEnd / uvScaleY
                );
            } else {
                position.push(
                    a.x, a.y, a.z,
                    midEnd.x, midEnd.y, midEnd.z,
                    c.x, c.y, c.z,
                );
                position.push(
                    midEnd.x, midEnd.y, midEnd.z,
                    midStart.x, midStart.y, midStart.z,
                    c.x, c.y, c.z,
                );

                uv.push(
                    uvMinX, uvStart / uvScaleY,
                    uvMidX, uvStart / uvScaleY,
                    uvMinX, uvEnd / uvScaleY
                );
                uv.push(
                    uvMidX, uvStart / uvScaleY,
                    uvMidX, uvEnd / uvScaleY,
                    uvMinX, uvEnd / uvScaleY
                );
            }
        }

        return uvEnd;
    }

    private buildSegmentsFromControlPoints(
        controlPoints: Vec3[][],
        isClosed: boolean,
        uvScaleY: number,
        uvMinX: number,
        uvMaxX: number,
        side: RoadSide,
        // height: number
    ): { position: number[]; uv: number[] } {
        const position: number[] = [];
        const uv: number[] = [];

        const segmentCount = controlPoints.length - (isClosed ? 0 : 1);
        let uvProgress = 0;

        for (let i = 0; i < segmentCount; i++) {
            const current = controlPoints[i];
            const next = controlPoints[(i + 1) % controlPoints.length];

            uvProgress = this.buildConnection(
                current,
                side,
                uvProgress,
                uvMinX,
                uvMaxX,
                uvScaleY,
                position,
                uv,
                // height,
                'start'
            );

            uvProgress = this.buildSegment(
                current,
                next,
                side,
                uvProgress,
                uvMinX,
                uvMaxX,
                uvScaleY,
                position,
                uv,
                // height
            );

            uvProgress = this.buildConnection(
                next,
                side,
                uvProgress,
                uvMinX,
                uvMaxX,
                uvScaleY,
                position,
                uv,
                // height,
                'end'
            );
        }

        return { position, uv };
    }

    private fillUVsFromPositions(uv: number[], position: number[], scale: number): void {
        for (let i = 0, j = 0; i < uv.length; i += 2, j += 3) {
            const px = position[j];
            const py = position[j + 1];

            uv[i] = px / scale;
            uv[i + 1] = py / scale;
        }
    }

    private getControlPoints(
        vertices: Vec3[],
        isClosed: boolean,
        width: number,
        vertexAdjacentToStart?: Vec2,
        vertexAdjacentToEnd?: Vec2,

    ): Vec3[][] {

        const controlPoints: Vec3[][] = [];

        for (let i = 0; i < vertices.length; i++) {
            const current = vertices[i];
            let prev = vertices[i - 1];
            let next = vertices[i + 1];

            if (isClosed) {
                if (!prev) {
                    prev = vertices[vertices.length - 1];
                }
                if (!next) {
                    next = vertices[0];
                }
            } else {
                if (!prev && vertexAdjacentToStart) {
                    prev = new Vec3(vertexAdjacentToStart.x, vertexAdjacentToStart.y, 0);

                }
                if (!next && vertexAdjacentToEnd) {
                    next = new Vec3(vertexAdjacentToEnd.x, vertexAdjacentToEnd.y, 0);
                }
            }

            let vA: Vec2, vB: Vec2;

            if (prev) {
                vA = Vec2.sub(current.xy, prev.xy);
            }
            if (next) {
                vB = Vec2.sub(next.xy, current.xy);
            }

            if (!vA) vA = Vec2.clone(vB);
            if (!vB) vB = Vec2.clone(vA);

            // Normalize direction current -> prev
            const aNorm = Vec2.normalize(vA);
            // Normalize direction next -> current
            const bNorm = Vec2.normalize(vB);

            // Perpendicular of direction current -> prev
            const leftA = Vec2.rotateLeft(aNorm);
            // Perpendicular of direction next -> current
            const leftB = Vec2.rotateLeft(bNorm);

            // Angle between direction current -> prev and next -> current
            const alpha = Math.atan2(bNorm.y, bNorm.x) - Math.atan2(aNorm.y, aNorm.x);
            // const alpha = Math.atan2(bNorm.x, bNorm.y) - Math.atan2(aNorm.x, aNorm.y);
            const alphaFixed = alpha < 0 ? alpha + Math.PI * 2 : alpha;
            // const offsetDir = Vec2.normalize(Vec2.add(leftA, leftB));
            let offsetDir = Vec2.add(leftA, leftB);
            if (Vec2.getLength(offsetDir) < 1e-6) offsetDir = leftA; // ou bNorm ⟂
            offsetDir = Vec2.normalize(offsetDir);
            // il faut que le sinus soit plus grand
            const offsetLength = width / (2 * Math.cos(alpha / 2));
            const offsetLengthAbs = (!prev && !next) ? width / 2 : Math.min(Math.abs(offsetLength), width / 2);

            const inverse = alphaFixed >= Math.PI;

            const pointLeft = Vec2.add(current.xy, Vec2.multiplyScalar(offsetDir, offsetLengthAbs));
            const pointRight = Vec2.add(current.xy, Vec2.multiplyScalar(offsetDir, -offsetLengthAbs));

            const mirroredA = this.reflectPoint(inverse ? pointRight : pointLeft, current.xy, Vec2.add(current.xy, aNorm));
            const mirroredB = this.reflectPoint(inverse ? pointRight : pointLeft, current.xy, Vec2.add(current.xy, bNorm));


            // @ts-expect-error
            let p0: Vec3 = inverse ? mirroredB : pointLeft;
            // @ts-expect-error
            let p1: Vec3 = inverse ? pointRight : mirroredB;
            // @ts-expect-error
            let p2: Vec3 = inverse ? mirroredA : pointLeft;
            // @ts-expect-error
            let p3: Vec3 = inverse ? pointRight : mirroredA;
            // @ts-expect-error
            let p4: Vec3 = inverse ? pointLeft : pointRight;

            p0 = new Vec3(p0.x, p0.y, current.z);
            p1 = new Vec3(p1.x, p1.y, current.z);
            p2 = new Vec3(p2.x, p2.y, current.z);
            p3 = new Vec3(p3.x, p3.y, current.z);
            p4 = new Vec3(p4.x, p4.y, current.z);


            if (!prev || !next) {
                controlPoints.push([p0, p1, p2, p3]);
            } else {
                controlPoints.push([p0, p1, p2, p3, p4]);
            }
        }

        return controlPoints;
    }




    private reflectPoint(point: Vec2, lineStart: Vec2, lineEnd: Vec2): Vec2 {

        // Step 1: Calculate the direction vector of the line (lineEnd - lineStart)
        const dir = Vec2.sub(lineEnd, lineStart);

        // Step 2: Normalize the direction vector
        const dirNormalized = Vec2.normalize(dir);

        // Step 3: Calculate the vector from the line start to the point (point - lineStart)
        const vecToPoint = Vec2.sub(point, lineStart);

        // Step 4: Project vecToPoint onto dirNormalized to get the projection length
        const projectionLength = Vec2.dot(vecToPoint, dirNormalized);

        // Step 5: Calculate the projection point on the line
        const projectionPoint = Vec2.add(lineStart, Vec2.multiplyScalar(dirNormalized, projectionLength));

        // Step 6: Calculate the vector from the projection point to the original point
        const reflectionVector = Vec2.sub(point, projectionPoint);

        // Step 7: Reflect the point by adding twice the reflection vector to the projection point
        const reflectedPoint = Vec2.sub(projectionPoint, reflectionVector);

        return reflectedPoint;
    }


}


export function projectAndAddGeometry(
    {
        position,
        uv,
        textureId,
    }: {
        position: number[];
        uv: number[];
        textureId: number;
    }
) {

    const arrays: {
        position: number[];
        uv: number[];
        normal: number[];
        textureId: number[];
    } = {
        position: [],
        uv: [],
        normal: [],
        textureId: []
    };


    appendArrayInPlace(arrays.position, position);
    appendArrayInPlace(arrays.uv, uv);

    const vertexCount = position.length / 3;

    for (let i = 0; i < vertexCount; i++) {
        arrays.normal.push(0, 0, 1);
        arrays.textureId.push(textureId);
    }

    return {
        type: 'projected',
        positionBuffer: new Float32Array(arrays.position),
        normalBuffer: new Float32Array(arrays.normal),
        uvBuffer: new Float32Array(arrays.uv),
        textureIdBuffer: new Uint8Array(arrays.textureId)
    };

}

const MAX_BLOCK_SIZE = 20000;

// https://github.com/stardazed/stardazed/blob/master/src/core/buffer.ts
export function appendArrayInPlace<T>(dest: T[], source: T[]): T[] {
    let offset: number = 0;
    let itemsLeft: number = source.length;

    if (itemsLeft <= MAX_BLOCK_SIZE) {
        dest.push.apply(dest, source);
    } else {
        while (itemsLeft > 0) {
            const pushCount = Math.min(MAX_BLOCK_SIZE, itemsLeft);
            const subSource = source.slice(offset, offset + pushCount);
            dest.push.apply(dest, subSource);
            itemsLeft -= pushCount;
            offset += pushCount;
        }
    }

    return dest;
}