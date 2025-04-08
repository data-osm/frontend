import { SkeletonBuilder, Skeleton } from 'straight-skeleton';
import Tile3DRing, { Tile3DRingType } from "./tile-3d-ring";
import earcut from "earcut";
import { Extent } from "../../giro-3d-module";
import { getTilesUnderTriangle } from "./roof/utils";
import polylabel from "polylabel";
import { CalcConvexHull, ComputeOMBB, Vector } from "../math/OMBB";
import Vec2 from "../math/vector2";
import Vec3 from '../math/vector3';

interface EarcutInput {
    vertices: number[];
    holes: number[];
}

export type OMBBResult = [Vec2, Vec2, Vec2, Vec2];

export interface StraightSkeletonResultPolygon {
    vertices: Vec2[];
    edgeStart: Vec2;
    edgeEnd: Vec2;
}

export class StraightSkeletonResult {
    public vertices: Vec2[];
    public polygons: StraightSkeletonResultPolygon[];

    public constructor(source?: Skeleton) {
        if (source) {
            this.vertices = source.vertices.map(v => new Vec2(v[0], v[1]));
            this.polygons = source.polygons.map(p => {
                const vertices = p.map(v => this.vertices[v]);

                return {
                    vertices: vertices,
                    edgeStart: vertices[vertices.length - 1],
                    edgeEnd: vertices[0]
                };
            });
        }
    }

    public clone(): StraightSkeletonResult {
        const copy = new StraightSkeletonResult();

        copy.vertices = this.vertices.map(v => Vec2.clone(v));
        copy.polygons = this.polygons.map(p => {
            const vertices = p.vertices.map(v => copy.vertices[this.vertices.indexOf(v)]);

            return {
                vertices: vertices,
                edgeStart: vertices[vertices.length - 1],
                edgeEnd: vertices[0]
            };
        });

        return copy;
    }
}

export default class Tile3DMultipolygon {
    public readonly rings: Tile3DRing[] = [];

    private cachedStraightSkeleton: StraightSkeletonResult = null;
    private cachedOMBB: OMBBResult;
    private cachedPoleOfInaccessibility: Vec3 = null;

    public constructor() {
    }

    public addRing(ring: Tile3DRing): void {
        this.rings.push(ring);
    }

    // public setOMBB(ombb: OMBBResult): void {


    //     this.cachedOMBB = ombb;
    // }

    public setPoleOfInaccessibility(poi: Vec3): void {
        this.cachedPoleOfInaccessibility = poi;
    }

    public getFootprint(
        {
            height,
            flip
        }: {
            height: number;
            flip: boolean;
        }
    ): {
        positions: number[];
        uvs: number[];
        normals: number[];
    } {
        const positions: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];
        const normalY = flip ? -1 : 1;

        const inners = this.rings.filter(ring => ring.type === Tile3DRingType.Inner);
        const outers = this.rings.filter(ring => ring.type === Tile3DRingType.Outer);

        for (const outer of outers) {
            let { vertices, holes } = this.getRingEarcutInput(outer, inners);
            const triangles = earcut(vertices, holes);

            if (!flip) {
                triangles.reverse();
            }

            for (let i = 0; i < triangles.length; i++) {
                positions.push(
                    vertices[triangles[i] * 2],
                    vertices[triangles[i] * 2 + 1],
                    height,
                );
                uvs.push(vertices[triangles[i] * 2], vertices[triangles[i] * 2 + 1]);
                normals.push(0, 0, normalY);
            }
        }

        return {
            positions,
            uvs,
            normals
        };
    }

    private getRingEarcutInput(outerRing: Tile3DRing, innerRings: Tile3DRing[]): EarcutInput {
        let vertices: number[] = [...outerRing.getFlattenVertices()];
        const holes: number[] = [];

        for (const inner of innerRings) {
            holes.push(vertices.length / 2);
            vertices = vertices.concat(inner.getFlattenVertices());
        }

        return { vertices, holes };
    }

    public ringsCentroid(): [number, number] {
        const outerRing = this.rings.find(ring => ring.type === Tile3DRingType.Outer);
        const polygonCoords = outerRing.getGeoJSONVertices();
        let xSum = 0;
        let ySum = 0;
        const n = polygonCoords.length;

        polygonCoords.forEach(([x, y]) => {
            xSum += x;
            ySum += y;
        });

        return [xSum / n, ySum / n];
    }

    public findCentralEdge() {
        if (!this.cachedStraightSkeleton) {
            console.error('Straight skeleton is null');
        }

        function _calculateDistance([x1, y1], [x2, y2]) {
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        }
        const centroid = this.ringsCentroid()
        let minDistance = Infinity;
        let centralEdge: StraightSkeletonResultPolygon = null;

        this.cachedStraightSkeleton.polygons.forEach((edge) => {
            // Calculer le milieu de l'arête
            const midX = (edge.edgeStart.x + edge.edgeEnd.x) / 2;
            const midY = (edge.edgeStart.y + edge.edgeEnd.y) / 2;

            // Calculer la distance du milieu au barycentre
            const distance = _calculateDistance([midX, midY], centroid);

            // Si cette distance est la plus petite, on met à jour l'arête centrale
            if (distance < minDistance) {
                minDistance = distance;
                centralEdge = edge;
            }
        });

        return centralEdge;
    }

    public getStraightSkeleton(): StraightSkeletonResult {
        if (!this.cachedStraightSkeleton) {
            const inputRings = this.getStraightSkeletonInput();

            if (inputRings.length === 0) {
                return null;
            }

            let skeleton: Skeleton = null;

            try {
                skeleton = SkeletonBuilder.buildFromPolygon(inputRings);
            } catch (e) {
                console.error('Failed to build straight skeleton\n', e);
            }

            if (skeleton) {
                this.cachedStraightSkeleton = new StraightSkeletonResult(skeleton);
            } else {
                console.error('Straight skeleton is null');
            }
        }

        return this.cachedStraightSkeleton;
    }

    private getStraightSkeletonInput(): [number, number][][] {
        const outerRing = this.rings.find(ring => ring.type === Tile3DRingType.Outer);
        const innerRings = this.rings.filter(ring => ring.type === Tile3DRingType.Inner);

        if (!outerRing) {
            return [];
        }

        const rings = [outerRing.getGeoJSONVertices()];

        for (const innerRing of innerRings) {
            rings.push(innerRing.getGeoJSONVertices());
        }

        return rings;
    }

    public getAABB(): Extent {
        const aabb = this.rings[0].getAABB();

        for (const ring of this.rings) {
            aabb.union(ring.getAABB());
        }

        return aabb;
    }

    private getOMBBInput() {
        const vectors = [];

        for (const ring of this.rings) {

            if (ring.type === Tile3DRingType.Outer) {
                vectors.push(...ring.nodes.map(v => new Vector(v.x, v.y)));
            }
        }

        return vectors;
    }

    public getOMBB(): OMBBResult {
        if (this.cachedOMBB == undefined) {
            const points = this.getOMBBInput();
            const convexHull = CalcConvexHull(points);
            const ombb = ComputeOMBB(convexHull);

            this.cachedOMBB = [
                new Vec2(ombb[0].x, ombb[0].y),
                new Vec2(ombb[1].x, ombb[1].y),
                new Vec2(ombb[2].x, ombb[2].y),
                new Vec2(ombb[3].x, ombb[3].y)
            ];

        }
        return this.cachedOMBB;
    }

    public getPoleOfInaccessibility(): Vec3 {
        if (!this.cachedPoleOfInaccessibility) {
            const outerRing = this.rings.find(ring => ring.type === Tile3DRingType.Outer);
            const innerRings = this.rings.filter(ring => ring.type === Tile3DRingType.Inner);

            if (!outerRing) {
                return null;
            }

            const outerPolygon = outerRing.getGeoJSONVertices();
            const innerPolygons = innerRings.map(ring => ring.getGeoJSONVertices());

            const result = polylabel([outerPolygon, ...innerPolygons], 1) as unknown as
                { 0: number; 1: number; distance: number };

            this.cachedPoleOfInaccessibility = new Vec3(
                result[0],
                result[1],
                result.distance
            );
        }

        return this.cachedPoleOfInaccessibility;
    }

    public populateWithPoints(resolution: number, tileSize: number): Vec2[] {
        const tiles = this.getCoveredTiles(resolution, tileSize);
        const points: Vec2[] = [];

        for (const tile of tiles) {
            const [x, y] = tile.split(' ').map(v => +v);
            const point = new Vec2(
                (x + 0.75 - Math.random() * 0.5) / resolution * tileSize,
                (y + 0.75 - Math.random() * 0.5) / resolution * tileSize,
            );

            let isInMultipolygon = true;

            for (const ring of this.rings) {
                if (ring.type === Tile3DRingType.Outer) {
                    if (!ring.isContainsPoints(point)) {
                        isInMultipolygon = false;
                    }
                } else {
                    if (ring.isContainsPoints(point)) {
                        isInMultipolygon = false;
                    }
                }
            }

            if (isInMultipolygon) {
                points.push(point);
            }
        }

        return points;
    }

    public createFloorVertices(
        ring: Array<Array<number>>,
    ) {
        // iterate on polygon and holes
        const holesIndices = [];
        let currentIndex = 0;
        const positions = [];
        // for (const ring of coordinates) {
        // NOTE: rings coming from openlayers are auto-closing, so we need to remove the last vertex
        // of each ring here
        if (currentIndex > 0) {
            holesIndices.push(currentIndex);
        }
        for (let i = 0; i < ring.length - 1; i++) {
            currentIndex++;
            const coord = ring[i];
            positions.push(coord[0]);
            positions.push(coord[1]);
            // let z = 0;
            // if (!ignoreZ) {
            //     if (stride === 3) {
            //         z = coord[Z];
            //     } else if (elevation != null) {
            //         z = Array.isArray(elevation) ? elevation[i] : elevation;
            //     }
            // }
            // z -= offset.z;
            // positions.push(z);
        }
        // }
        return positions
    }


    private getCoveredTiles(resolution: number, tileSize: number): Set<string> {
        const tiles: Set<string> = new Set();
        const multipolygons: Tile3DRing[][] = [];

        for (const ring of this.rings) {
            if (ring.type === Tile3DRingType.Outer) {
                multipolygons.push([ring]);
            } else {
                if (!multipolygons[multipolygons.length - 1]) {
                    console.error('Invalid ring order, skipping covered tiles calculation');
                    return tiles;
                }

                multipolygons[multipolygons.length - 1].push(ring);
            }
        }

        for (const multipolygon of multipolygons) {

            let { vertices, holes } = this.getRingEarcutInput(multipolygon[0], multipolygon.slice(1));
            vertices = this.createFloorVertices([vertices])
            const triangles = earcut(vertices, holes);

            for (let i = 0; i < triangles.length; i += 3) {
                const triangle: [number, number][] = [
                    [vertices[triangles[i] * 2], vertices[triangles[i] * 2 + 1]],
                    [vertices[triangles[i + 1] * 2], vertices[triangles[i + 1] * 2 + 1]],
                    [vertices[triangles[i + 2] * 2], vertices[triangles[i + 2] * 2 + 1]]
                ];

                const covered = getTilesUnderTriangle(
                    triangle,
                    1 / tileSize * resolution,
                    1 / tileSize * resolution
                );

                for (const tile of covered) {
                    tiles.add(`${tile.x} ${tile.y}`);
                }
            }
        }

        return tiles;
    }

    public getArea(): number {
        let area: number = 0;

        for (const ring of this.rings) {
            area += ring.getArea();
        }

        return area;
    }
}
