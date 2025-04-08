import { MathUtils } from "three";
import { RoofBuilder, RoofGeometry, RoofParams, RoofSkirt } from "./type";
import Tile3DMultipolygon, { StraightSkeletonResult, StraightSkeletonResultPolygon } from "../tile3d-multipolygon";
import Vec2 from "../../math/vector2";
import earcut from 'earcut';
import { calculateNormal, signedDstToLine } from "./utils";
import Vec3 from "../../math/vector3";


export default class HippedRoofBuilder implements RoofBuilder {
    public build(params: RoofParams): RoofGeometry {
        const { multipolygon, flip } = params;

        const skeleton = multipolygon.getStraightSkeleton();

        if (!skeleton) {
            return null;
        }

        const maxSkeletonHeight = this.getSkeletonMaxHeight(skeleton);

        let height: number = params.height;
        let minHeight: number = params.minHeight;
        let facadeHeightOverride: number = null;

        if (params.angle !== null && params.angle !== undefined) {
            height = maxSkeletonHeight * Math.tan(MathUtils.degToRad(params.angle ?? 45));
            minHeight = params.buildingHeight - height;
            facadeHeightOverride = params.buildingHeight - height;
        }

        const { position, uv, skirt } = this.convertSkeletonToVertices({
            multipolygon,
            skeleton,
            minHeight,
            height,
            maxSkeletonHeight,
            flip,
            scaleX: params.scaleX,
            scaleY: params.scaleY
        });
        const normal = this.calculateNormals(position, flip);

        return {
            position: position,
            normal: normal,
            uv: uv,
            addSkirt: !!skirt,
            skirt,
            facadeHeightOverride
        };
    }

    protected getSkeletonMaxHeight(skeleton: StraightSkeletonResult): number {
        let maxHeight = 0;

        for (const polygon of skeleton.polygons) {
            const edgeLine: [Vec2, Vec2] = [polygon.edgeStart, polygon.edgeEnd];

            for (const vertex of polygon.vertices) {
                const dst = this.getVertexHeightFromEdge(vertex, edgeLine, 1, 1);

                maxHeight = Math.max(maxHeight, dst);
            }
        }

        return maxHeight;
    }

    protected convertSkeletonToVertices(
        {
            multipolygon,
            skeleton,
            minHeight,
            height,
            maxSkeletonHeight,
            flip,
            scaleX,
            scaleY
        }: {
            multipolygon: Tile3DMultipolygon;
            skeleton: StraightSkeletonResult;
            minHeight: number;
            height: number;
            maxSkeletonHeight: number;
            flip: boolean;
            scaleX: number;
            scaleY: number;
        }
    ): { position: number[]; uv: number[]; skirt?: RoofSkirt } {
        let positionResult: number[] = [];
        let uvResult: number[] = [];

        for (const polygon of skeleton.polygons) {
            const { position, uv } = this.convertSkeletonPolygonToVertices({
                polygon,
                minHeight,
                height,
                maxSkeletonHeight,
                scaleX,
                scaleY
            });

            if (flip) {
                position.reverse();
            }

            positionResult = positionResult.concat(position);
            uvResult = uvResult.concat(uv);
        }

        return { position: positionResult, uv: uvResult };
    }

    protected convertSkeletonPolygonToVertices(
        {
            polygon,
            minHeight,
            height,
            maxSkeletonHeight,
            scaleX,
            scaleY
        }: {
            polygon: StraightSkeletonResultPolygon;
            minHeight: number;
            height: number;
            maxSkeletonHeight: number;
            scaleX: number;
            scaleY: number;
        }
    ): { position: number[]; uv: number[] } {
        const polygonVertices: number[] = [];

        for (const vertex of polygon.vertices) {
            polygonVertices.push(vertex.x, vertex.y);
        }

        return this.triangulatePolygon(
            polygonVertices,
            minHeight,
            height,
            maxSkeletonHeight,
            [polygon.edgeStart, polygon.edgeEnd],
            scaleX,
            scaleY
        );
    }

    protected triangulatePolygon(
        flatVertices: number[],
        minHeight: number,
        height: number,
        maxSkeletonHeight: number,
        edgeLine: [Vec2, Vec2],
        uvScaleX: number,
        uvScaleY: number,
        dstModifier: (n: number) => number = (n: number): number => n
    ): { position: number[]; uv: number[] } {
        const position: number[] = [];
        const uv: number[] = [];

        const triangles = earcut(flatVertices).reverse();

        for (let i = 0; i < triangles.length; i++) {
            const index = triangles[i];

            const x = flatVertices[index * 2];
            const y = flatVertices[index * 2 + 1];
            const vertex = new Vec2(x, y);

            const dst = signedDstToLine(vertex, edgeLine);
            const vertexHeight = minHeight + height * dstModifier(dst / maxSkeletonHeight);

            position.push(x, y, vertexHeight);

            const lineNormal: [Vec2, Vec2] = [
                edgeLine[1],
                Vec2.add(edgeLine[1], Vec2.rotateRight(Vec2.sub(edgeLine[0], edgeLine[1])))
            ];
            const uvX = signedDstToLine(vertex, lineNormal);
            const uvYScale = Math.sin(Math.atan(maxSkeletonHeight / height));

            uv.push(
                uvX / uvScaleX,
                dst / uvYScale / uvScaleY,
            );
        }

        return { position, uv };
    }

    private calculateNormals(vertices: number[], flip: boolean = false): number[] {
        const normals: number[] = [];

        for (let i = 0; i < vertices.length; i += 9) {
            const a = new Vec3(vertices[i], vertices[i + 1], vertices[i + 2]);
            const b = new Vec3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
            const c = new Vec3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

            const normal = flip ? calculateNormal(c, b, a) : calculateNormal(a, b, c);
            const normalArray = Vec3.toArray(normal);

            for (let j = i; j < i + 9; j++) {
                normals[j] = normalArray[j % 3];
            }
        }

        return normals;
    }

    protected getVertexHeightFromEdge(vertex: Vec2, edge: [Vec2, Vec2], skeletonHeight: number, roofHeight: number): number {
        const dst = signedDstToLine(vertex, edge);

        return dst / skeletonHeight * roofHeight;
    }
}
