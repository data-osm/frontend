import { SkeletonBuilder, Skeleton } from 'straight-skeleton';
import Tile3DRing, { Tile3DRingType, Tile3DRingWith3D } from "./tile-3d-ring";
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
    public readonly rings3D: Tile3DRingWith3D[] = [];

    private cachedStraightSkeleton: StraightSkeletonResult = null;
    private cachedOMBB: OMBBResult;
    private cachedPoleOfInaccessibility: Vec3 = null;

    osmId
    public constructor(osmId) {
        this.osmId = osmId
    }

    public addRing(ring: Tile3DRing): void {
        this.rings.push(ring);

    }

    public addRing3D(ring: Tile3DRingWith3D): void {
        this.rings3D.push(ring);
        this.rings.push(new Tile3DRing(ring.type, ring.nodes.map((v) => v.xy)));

    }

    public setOMBB(ombb: OMBBResult): void {


        this.cachedOMBB = ombb;
    }

    public setPoleOfInaccessibility(poi: Vec3): void {
        this.cachedPoleOfInaccessibility = poi;
    }



    public getFootPrintAsOutlineArea({
        min_height, max_height, thickness = 0.1

    }: { min_height: number, max_height: number, thickness?: number }) {
        const positions: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];

        const half = thickness / 2;

        // On ne s'intéresse qu'aux anneaux “Outer” pour le pourtour
        const outers = this.rings.filter(r => r.type === Tile3DRingType.Outer);
        const inners = this.rings.filter(r => r.type === Tile3DRingType.Inner);

        for (const outer of outers) {
            const { vertices, holes } = this.getRingEarcutInput(outer, inners);
            // Nombre de sommets de la boucle extérieure
            const countOuter = holes.length > 0
                ? holes[0]
                : vertices.length / 2;

            // On collecte les points 2D
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i < countOuter; i++) {
                pts.push({
                    x: vertices[2 * i],
                    y: vertices[2 * i + 1]
                });
            }

            // Pour chaque arête, on crée un quad (2 triangles)
            for (let i = 0; i < countOuter; i++) {
                const p0 = pts[i];
                const p1 = pts[(i + 1) % countOuter];
                // vecteur directeur et normale perpendiculaire
                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;

                // points en “inner” et “outer” pour ce segment
                const p0i = { x: p0.x - nx * half, y: p0.y - ny * half };
                const p0o = { x: p0.x + nx * half, y: p0.y + ny * half };
                const p1i = { x: p1.x - nx * half, y: p1.y - ny * half };
                const p1o = { x: p1.x + nx * half, y: p1.y + ny * half };

                // Triangle 1 : p0i, p0o, p1i
                // positions.push(
                //     p0i.x, p0i.y, max_height,
                //     p0o.x, p0o.y, min_height,
                //     p1i.x, p1i.y, min_height
                // );
                // uvs.push(
                //     0, 0,
                //     1, 0,
                //     0, 1
                // );
                // normals.push(
                //     0, 0, 1,
                //     0, 0, 1,
                //     0, 0, 1
                // );

                // Triangle 2 : p1i, p0o, p1o
                // positions.push(
                //     p1i.x, p1i.y, max_height,
                //     p0o.x, p0o.y, max_height,
                //     p1o.x, p1o.y, min_height
                // );
                // uvs.push(
                //     0, 1,
                //     1, 0,
                //     1, 1
                // );
                // normals.push(
                //     0, 0, 1,
                //     0, 0, 1,
                //     0, 0, 1
                // );
                this.addWallQuad(p0o, p1o, min_height, max_height, positions, normals, uvs);
            }
        }

        return { positions, uvs, normals };
    }

    addWallQuad(p0, p1, z0, z1, positions, normals, uvs, texU = 1, texV = 1, doubleSided = true) {
        // Vecteurs utiles

        const e = new Vec3(p1.x - p0.x, p1.y - p0.y, 0);         // arête horizontale
        const n = Vec3.cross(e, new Vec3(0, 0, 1)).normalize();                     // normale extérieure (CCW)

        const len = Vec3.getLength(e);
        const u0 = 0, u1 = 1;                                   // U = longueur
        const v0 = 0, v1 = 1;                            // V = hauteur

        // Sommets (Tri1: A(p0,z1) B(p0,z0) C(p1,z0)  | Tri2: D(p1,z1) A(p0,z1) C(p1,z0))
        const A = [p0.x, p0.y, z1], B = [p0.x, p0.y, z0], C = [p1.x, p1.y, z0], D = [p1.x, p1.y, z1];

        // Positions
        positions.push(...A, ...B, ...C, ...D, ...A, ...C);

        // Normales (flat shading) : même normale pour les 6 sommets
        normals.push(...Vec3.toArray(n), ...Vec3.toArray(n), ...Vec3.toArray(n),
            ...Vec3.toArray(n), ...Vec3.toArray(n), ...Vec3.toArray(n));

        // UV : couvre le rect complet
        // Tri1: A(u0,v1), B(u0,v0), C(u1,v0)
        uvs.push(u0, v1, u0, v0, u1, v0);
        // Tri2: D(u1,v1), A(u0,v1), C(u1,v0)
        uvs.push(u1, v1, u0, v1, u1, v0);

        if (doubleSided) {
            // Duplique la face arrière avec winding inversé et normales opposées

            const nn = Vec3.multiplyScalar(Vec3.clone(n), -1);;
            // Tri back 1: C,B,A  | back 2: C,A,D
            positions.push(...C, ...B, ...A, ...C, ...A, ...D);

            normals.push(...Vec3.toArray(nn), ...Vec3.toArray(nn), ...Vec3.toArray(nn),
                ...Vec3.toArray(nn), ...Vec3.toArray(nn), ...Vec3.toArray(nn));
            // UV identiques (mêmes coords pour l’autre côté)
            uvs.push(u1, v0, u0, v0, u0, v1, u1, v0, u0, v1, u1, v1);
        }
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

    public get3DFootprint(
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

        const inners = this.rings3D.filter(ring => ring.type === Tile3DRingType.Inner);
        const outers = this.rings3D.filter(ring => ring.type === Tile3DRingType.Outer);

        for (const outer of outers) {
            let { vertices, holes } = this.getRing3DEarcutInput(outer, inners);

            const triangles = earcut(vertices, holes, 3);


            if (!flip) {
                triangles.reverse();
            }

            for (let i = 0; i < triangles.length; i++) {
                positions.push(
                    vertices[triangles[i] * 3],
                    vertices[triangles[i] * 3 + 1],
                    vertices[triangles[i] * 3 + 2] + height,
                );
                uvs.push(vertices[triangles[i] * 3], vertices[triangles[i] * 3 + 1]);
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

    private getRing3DEarcutInput(outerRing: Tile3DRingWith3D, innerRings: Tile3DRingWith3D[]): EarcutInput {
        let vertices: number[] = [...outerRing.getFlattenVertices()];
        const holes: number[] = [];

        for (const inner of innerRings) {
            holes.push(vertices.length / 3);
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
    skeleton
    public setStraightSkeleton(skeleton: Skeleton) {
        this.skeleton = skeleton
        this.cachedStraightSkeleton = new StraightSkeletonResult(skeleton);
    }
    public getStraightSkeleton(): StraightSkeletonResult {
        if (!this.cachedStraightSkeleton) {
            console.log("Skeleton non généré en back", this.osmId)
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

    public populateWithPoints(density: number = 0.001): Vec2[] {
        const points: Vec2[] = [];

        const allVertices: Vec2[] = [];
        for (const ring of this.rings) {
            for (const vertex of ring.nodes) {
                allVertices.push(vertex);
            }
        }
        const minX = Math.min(...allVertices.map(v => v.x));
        const maxX = Math.max(...allVertices.map(v => v.x));
        const minY = Math.min(...allVertices.map(v => v.y));
        const maxY = Math.max(...allVertices.map(v => v.y));

        let totalArea = 0;
        for (const ring of this.rings) {
            const area = ring.getArea();
            totalArea += ring.type === Tile3DRingType.Outer ? area : -area;
        }

        let targetPointCount = Math.round(totalArea * density);
        // console.log(targetPointCount, totalArea, density)
        // targetPointCount = Math.min(density, 100)

        let attempts = 0;
        const maxAttempts = targetPointCount * 20; // sécurité anti-boucle infinie

        while (points.length < targetPointCount && attempts < maxAttempts) {
            attempts++;

            const randomX = Math.random() * (maxX - minX) + minX;
            const randomY = Math.random() * (maxY - minY) + minY;
            const point = new Vec2(randomX, randomY);

            let isInMultipolygon = true;

            for (const ring of this.rings) {
                if (ring.type === Tile3DRingType.Outer) {
                    // doit être dans tous les outer rings
                    if (!ring.isContainsPoints(point)) {
                        isInMultipolygon = false;
                        break;
                    }
                } else {
                    // ne doit pas être dans un inner ring
                    if (ring.isContainsPoints(point)) {
                        isInMultipolygon = false;
                        break;
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
