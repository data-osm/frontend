import { calculateNormal } from "../building/roof/utils";
import Vec2 from "../math/vector2";
import Vec3 from "../math/vector3";

export default class FenceBuilder {
    public static build(
        {
            vertices,
            minHeight,
            height,
            uvWidth,
            uvHeight,
            uvHorizontalOffset = 0
        }: {
            vertices: Vec3[];
            minHeight: number;
            height: number;
            uvWidth: number;
            uvHeight: number;
            uvHorizontalOffset?: number;
        }
    ): {
        position: number[];
        uv: number[];
        normal: number[];
    } {
        const position: number[] = [];
        const uv: number[] = [];
        const normal: number[] = [];
        let uvProgress: number = uvHorizontalOffset;

        const maxHeight = minHeight + height;

        for (let i = 0; i < vertices.length - 1; i++) {
            const vertex = vertices[i];
            const nextVertex = vertices[i + 1];
            const segmentLength = Vec2.distance(new Vec2(vertex.x, vertex.y), new Vec2(nextVertex.x, nextVertex.y));

            position.push(
                vertex.x, vertex.y, vertex.z + minHeight,
                nextVertex.x, nextVertex.y, nextVertex.z + minHeight,
                vertex.x, vertex.y, vertex.z + maxHeight,

                nextVertex.x, nextVertex.y, nextVertex.z + minHeight,
                nextVertex.x, nextVertex.y, nextVertex.z + maxHeight,
                vertex.x, vertex.y, vertex.z + maxHeight
            );

            uv.push(
                uvProgress / uvWidth, 0,
                (uvProgress + segmentLength) / uvWidth, 0,
                uvProgress / uvWidth, uvHeight,

                (uvProgress + segmentLength) / uvWidth, 0,
                (uvProgress + segmentLength) / uvWidth, uvHeight,
                uvProgress / uvWidth, uvHeight,
            );

            const segmentNormal = calculateNormal(
                new Vec3(nextVertex.x, nextVertex.y, 0),
                new Vec3(vertex.x, vertex.y, 0),
                new Vec3(vertex.x, vertex.y, 1)
            );

            for (let j = 0; j < 6; j++) {
                normal.push(segmentNormal.x, segmentNormal.y, segmentNormal.z);
            }

            uvProgress += segmentLength;
        }

        return {
            position,
            uv,
            normal
        };
    }
}