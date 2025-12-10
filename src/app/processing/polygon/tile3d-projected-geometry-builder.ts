import { Box3, Vector3 } from "three";
import { appendArrayInPlace } from "../building/building-builder";
import Tile3DRing, { Tile3DRingType, Tile3DRingWith3D } from "../building/tile-3d-ring";
import Tile3DMultipolygon from "../building/tile3d-multipolygon";
import { RoadBuilder, RoadSide } from "../linestring/line-builder";
import Vec2 from "../math/vector2";
import Vec3 from "../math/vector3";
import SurfaceBuilder, { SurfaceBuilderOrientation } from "./surface-builder";
import FenceBuilder from "../linestring/fence-builder";
import { project, projectLineSegment } from "./surface-projection";
import { updateCoordinatesWithElevation } from "../elevation/listElevation";


export interface Tile3DFeature {
    type: string;
}

export interface Tile3DTerrainMaskGeometry extends Tile3DFeature {
    type: 'mask';
    positionBuffer: Float32Array;
}

export interface Tile3DProjectedGeometry extends Tile3DFeature {
    type: 'projected';
    zIndex: number;
    boundingBox: Box3;
    positionBuffer: Float32Array;
    normalBuffer: Float32Array;
    uvBuffer: Float32Array;
    textureIdBuffer: Uint8Array;
}

export interface Tile3DHuggingGeometry extends Tile3DFeature {
    type: 'hugging';
    boundingBox: Box3;
    positionBuffer: Float32Array;
    normalBuffer: Float32Array;
    uvBuffer: Float32Array;
    textureIdBuffer: Uint8Array;
    zIndex: number;
}

export type Tile3DInstanceType = 'tree' | 'adColumn' | 'transmissionTower' | 'utilityPole' | 'wire' | 'hydrant'
    | 'trackedCrane' | 'towerCrane' | 'bench' | 'picnicTable' | 'busStop' | 'windTurbine' | 'shrubbery'
    | 'memorial' | 'statueSmall' | 'statueBig' | 'sculpture' | "streetLamp2Lamp" | "streetLampBentMast" | "streetLampPole" | "streetLampStraightMast";

export enum InstanceStructure {
    Generic,
    Tree,
    Advanced
}
export interface LODConfig {
    structure: InstanceStructure;
    LOD0MaxDistance: number;
    LOD1MaxDistance: number;
    LOD1Fraction: number;
}


// export const Tile3DInstanceLODConfig: Record<Tile3DInstanceType, LODConfig> = {
//     tree: {
//         structure: InstanceStructure.Tree,
//         LOD0MaxDistance: 2000,
//         LOD1MaxDistance: 5000,
//         LOD1Fraction: 0.5
//     },
//     shrubbery: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1200,
//         LOD1MaxDistance: 2500,
//         LOD1Fraction: 0.5,
//     },
//     adColumn: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     transmissionTower: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 3000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     utilityPole: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 3000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     wire: {
//         structure: InstanceStructure.Advanced,
//         LOD0MaxDistance: 3000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     hydrant: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     trackedCrane: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 2000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     towerCrane: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 3000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     bench: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     picnicTable: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     busStop: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     windTurbine: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 5000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     memorial: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 2000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     statueSmall: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     statueBig: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     sculpture: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     },
//     streetLamp: {
//         structure: InstanceStructure.Generic,
//         LOD0MaxDistance: 1000,
//         LOD1MaxDistance: 0,
//         LOD1Fraction: 0,
//     }
// };
export interface Tile3DInstance extends Tile3DFeature {
    type: 'instance';
    instanceType: Tile3DInstanceType;
    x: number;
    y: number;
    z: number;
    scale?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    textureId?: number;
    seed?: number;
}


export function projectGeometryOnTerrain(
    {
        position,
        uv,
        segment,
        tileSize,
        height = 0,
    }: {
        position: number[];
        uv: number[];
        segment: number,
        tileSize: number;
        height?: number;
    }
): {
    position: number[];
    uv: number[];
} {
    // if (height === 0) {

    //     // height = 0.1 + height;
    // }

    // updateCoordinatesWithElevation(position as [number, number], capabilities)
    const projectedPositions: number[] = [];
    const projectedUVs: number[] = [];
    // console.log(position, "position")
    for (let i = 0, j = 0; i < position.length; i += 9, j += 6) {
        const trianglePositions: [number, number][] = [
            [position[i], position[i + 1]],
            [position[i + 3], position[i + 4]],
            [position[i + 6], position[i + 7]]
        ];
        // if(trianglePositions)
        const triangleUVs: [number, number][] = [
            [uv[j], uv[j + 1]],
            [uv[j + 2], uv[j + 3]],
            [uv[j + 4], uv[j + 5]]
        ];
        ;
        const projected = project({
            triangle: trianglePositions,
            attributes: {
                uv: triangleUVs
            },
            triangleZ: [position[i + 2], position[i + 5], position[i + 8]],
            segment: segment,
            tileSize,
            height
        });

        if (projected.position.length > 0) {
            const newPositions = Array.from(projected.position);
            const newUVs = Array.from(projected.attributes.uv);

            // for (let i = 2; i < newPositions.length; i += 3) {
            //     // newPositions[i] = z;
            // }

            projectedPositions.push(...newPositions);
            projectedUVs.push(...newUVs);
        }
    }


    return {
        position: projectedPositions,
        uv: projectedUVs
    };
}
type ProjectedPolyline = { vertices: Vec3[]; startProgress: number };
export function projectLineOnTerrain(vertices: Vec3[], segment: number, tileSize: number): ProjectedPolyline[] {
    const projectorSegmentCount = segment;
    const projectedPolylines: ProjectedPolyline[] = [];
    let lineProgress: number = 0;

    for (let i = 0; i < vertices.length - 1; i++) {
        const start = vertices[i];
        const end = vertices[i + 1];
        const segmentLength = Vec3.distance(start, end);

        const projected = projectLineSegment({
            lineStart: start.xy,
            lineEnd: end.xy,
            tileSize: tileSize,
            segmentCount: projectorSegmentCount,
            lineZ: [start.z, end.z]
        });

        if (projected.vertices.length === 0) {
            lineProgress += segmentLength;
            continue;
        }

        if (projectedPolylines.length > 0) {
            const lastPolylineVertices = projectedPolylines[projectedPolylines.length - 1].vertices;
            const lastPoint = lastPolylineVertices[lastPolylineVertices.length - 1];

            if (lastPoint.equals(projected.vertices[0])) {
                for (let i = 1; i < projected.vertices.length; i++) {
                    lastPolylineVertices.push(projected.vertices[i]);
                }

                lineProgress += segmentLength;
                continue;
            }
        }

        projectedPolylines.push({
            vertices: projected.vertices,
            startProgress: lineProgress + projected.startProgress * segmentLength
        });

        lineProgress += segmentLength;
    }

    return projectedPolylines;
}

export class Tile3DProjectedGeometryBuilder {
    private readonly arrays: {
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
    private readonly terrainMaskPositions: number[] = [];
    private readonly boundingBox: Box3 = new Box3();
    private readonly multipolygon: Tile3DMultipolygon = new Tile3DMultipolygon(null);
    private zIndex: number = 0;
    private segment: number;
    private tileSize: number;

    public constructor(segment: number, tileSize: number, multipolygon?: Tile3DMultipolygon) {
        if (multipolygon) {
            this.multipolygon = multipolygon;
        }
        this.segment = segment;
        this.tileSize = tileSize

    }

    public addRing(type: Tile3DRingType, nodes: Vec3[]): void {
        const ring = new Tile3DRingWith3D(type, nodes);
        this.multipolygon.addRing3D(ring);
    }

    public setZIndex(value: number): void {
        this.zIndex = value;
    }

    public addPolygon(
        {
            textureId,
            height,
            uvScale = 1,
            isOriented = false,
            stretch = false,
            orientation = SurfaceBuilderOrientation.Along,
            addUsageMask
        }: {
            height: number;
            textureId: number;
            uvScale?: number;
            isOriented?: boolean;
            stretch?: boolean;
            orientation?: SurfaceBuilderOrientation;
            addUsageMask?: boolean;
        }
    ): void {
        const surface = SurfaceBuilder.build({
            multipolygon: this.multipolygon,
            isOriented: isOriented,
            orientation: orientation,
            stretch: stretch,
            uvScale: uvScale
        });

        this.projectAndAddGeometry({
            position: surface.position,
            uv: surface.uv,
            textureId: textureId,
            height: height
        });

        if (addUsageMask) {
            this.addMaskGeometry(surface.position);
        }
    }

    public addPath(
        {
            vertexAdjacentToStart = null,
            vertexAdjacentToEnd = null,
            width,
            uvFollowRoad,
            uvScale = 1,
            uvScaleY = 1,
            side = RoadSide.Both,
            uvMinX = 0,
            uvMaxX = 1,
            height = 0,
            textureId
        }: {
            vertexAdjacentToStart?: Vec2;
            vertexAdjacentToEnd?: Vec2;
            width: number;
            uvFollowRoad: boolean;
            uvScale?: number;
            uvScaleY?: number;
            side?: RoadSide;
            uvMinX?: number;
            uvMaxX?: number;
            height?: number;
            textureId: number;
        }
    ): void {
        const vertices = this.multipolygon.rings3D[0].nodes;
        const roadBuilder = new RoadBuilder()
        const road = roadBuilder.build({
            vertices: vertices.map((v) => new Vec3(v.x, v.y, v.z + height)),
            vertexAdjacentToStart,
            vertexAdjacentToEnd,
            width,
            uvFollowRoad,
            uvScale,
            uvScaleY,
            side,
            uvMinX,
            uvMaxX
        });



        this.projectAndAddGeometry({
            position: road.position,
            uv: road.uv,
            textureId,
            height
        });

        this.addMaskGeometry(road.position);
    }

    public addFence(
        {
            minHeight,
            height,
            width,
            textureId
        }: {
            minHeight: number;
            height: number;
            width: number;
            textureId: number;
        }
    ): void {
        const ring = this.multipolygon.rings3D[0];
        // const projectedPolylines = projectLineOnTerrain(ring.nodes);
        const projectedPolylines = [{ vertices: ring.nodes, startProgress: 0 }];

        for (const polyline of projectedPolylines) {
            const fence = FenceBuilder.build({
                vertices: polyline.vertices,
                minHeight: minHeight,
                height: height,
                uvWidth: width,
                uvHeight: 1,
                uvHorizontalOffset: polyline.startProgress
            });

            this.addGeometry({
                position: fence.position,
                normal: fence.normal,
                uv: fence.uv,
                textureId: textureId,
            });
        }
    }

    public addExtrudedPath(
        {
            width,
            height,
            textureId,
            textureScaleX,
            textureScaleY
        }: {
            width: number;
            height: number;
            textureId: number;
            textureScaleX: number;
            textureScaleY: number;
        }
    ): void {
        const vertices = this.multipolygon.rings3D[0].nodes;
        const road = new RoadBuilder().build({
            vertices: vertices,
            width: width,
            uvFollowRoad: true,
            uvScaleY: textureScaleY,
            uvMinX: 0,
            uvMaxX: width / textureScaleX
        });

        this.projectAndAddGeometry({
            position: road.position,
            uv: road.uv,
            textureId: textureId,
            height: height
        });

        const projectedPolylines = projectLineOnTerrain(road.border, this.segment, this.tileSize);


        for (const polyline of projectedPolylines) {
            const fence = FenceBuilder.build({
                vertices: polyline.vertices,
                minHeight: 0,
                height: height,
                uvWidth: textureScaleX,
                uvHeight: height / textureScaleY,
                uvHorizontalOffset: polyline.startProgress
            });

            this.addGeometry({
                position: fence.position,
                normal: fence.normal,
                uv: fence.uv,
                textureId: textureId,
            });
        }
    }

    public computeSmoothNormalsNoIndex(
        positions: number[]
    ) {
        const vertexCount = positions.length / 3;
        const normals = new Float32Array(positions.length);

        // 1. calculer normales de face et les accumuler sur chaque sommet du triangle
        for (let i = 0; i < vertexCount; i += 3) {
            const i0 = i * 3;
            const i1 = (i + 1) * 3;
            const i2 = (i + 2) * 3;

            // p0, p1, p2
            const p0x = positions[i0], p0y = positions[i0 + 1], p0z = positions[i0 + 2];
            const p1x = positions[i1], p1y = positions[i1 + 1], p1z = positions[i1 + 2];
            const p2x = positions[i2], p2y = positions[i2 + 1], p2z = positions[i2 + 2];

            // edges
            const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
            const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;

            // face normal = e1 x e2
            const nx = e1y * e2z - e1z * e2y;
            const ny = e1z * e2x - e1x * e2z;
            const nz = e1x * e2y - e1y * e2x;

            // accumulate on all 3 verts of this face
            normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
            normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
            normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
        }

        // 2. lisser entre doublons géométriques :
        //    on fait une table "position -> indices qui ont cette position"
        const posMap = new Map<string, number[]>();

        for (let v = 0; v < vertexCount; v++) {
            const x = positions[v * 3 + 0];
            const y = positions[v * 3 + 1];
            const z = positions[v * 3 + 2];

            // ATTENTION : si ta géométrie est générée procéduralement,
            // mets un arrondi pour éviter les flottants quasi identiques
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;

            let arr = posMap.get(key);
            if (!arr) {
                arr = [];
                posMap.set(key, arr);
            }
            arr.push(v);
        }

        // 3. pour chaque groupe de positions identiques,
        //    on moyenne la normale et on la réinjecte dans chaque sommet du groupe
        for (const group of posMap.values()) {
            let nx = 0, ny = 0, nz = 0;

            // somme des normales accumulées
            for (const v of group) {
                nx += normals[v * 3 + 0];
                ny += normals[v * 3 + 1];
                nz += normals[v * 3 + 2];
            }

            // normaliser
            const len = Math.hypot(nx, ny, nz) || 1.0;
            nx /= len; ny /= len; nz /= len;

            // réécrire la même normale lissée pour tous les doublons de ce point
            for (const v of group) {
                normals[v * 3 + 0] = nx;
                normals[v * 3 + 1] = ny;
                normals[v * 3 + 2] = nz;
            }
        }

        return Array.from(normals);
    }
    toDecimal(n) {
        if (n === 0) return 0.1;
        if (n < 10) return 0.1 + (n / 100);     // ex: 3 → 0.3
        if (n < 100) return 0.1 + (n / 10);   // ex: 19 → 0.19
        return n / Math.pow(10, String(n).length); // pour tout autre cas
    }


    private projectAndAddGeometry(
        {
            position,
            uv,
            textureId,
            height = 0
        }: {
            position: number[];
            uv: number[];
            textureId: number;
            height?: number;
        }
    ): void {
        const projected = projectGeometryOnTerrain({ position, uv, height: height, segment: this.segment, tileSize: this.tileSize });
        appendArrayInPlace(this.arrays.position, projected.position);
        appendArrayInPlace(this.arrays.uv, projected.uv);
        this.addVerticesToBoundingBox(projected.position);
        const vertexCount = projected.position.length / 3;
        for (let i = 0; i < vertexCount; i++) {
            this.arrays.normal.push(0, 0, 1);
            this.arrays.textureId.push(textureId);
        }

        // this.arrays.position.push(...position);
        // this.arrays.uv.push(...uv);

        // const vertexCount = position.length / 3;
        // for (let i = 0; i < vertexCount; i++) {
        //     this.arrays.normal.push(0, 0, 1);
        //     this.arrays.textureId.push(textureId);
        // }
    }

    private addGeometry(
        {
            position,
            normal,
            uv,
            textureId
        }: {
            position: number[];
            normal: number[];
            uv: number[];
            textureId: number;
        }
    ): void {
        appendArrayInPlace(this.arrays.position, position);
        appendArrayInPlace(this.arrays.normal, normal);
        appendArrayInPlace(this.arrays.uv, uv);
        this.addVerticesToBoundingBox(position);

        const vertexCount = position.length / 3;

        for (let i = 0; i < vertexCount; i++) {
            this.arrays.textureId.push(textureId);
        }
    }

    private addMaskGeometry(position: number[]): void {
        for (let i = 0; i < position.length; i += 3) {
            this.terrainMaskPositions.push(position[i], position[i + 2]);
        }
    }

    private addVerticesToBoundingBox(vertices: number[]): void {
        const tempVec3 = new Vec3();

        for (let i = 0; i < vertices.length; i += 3) {
            tempVec3.set(vertices[i], vertices[i + 1], vertices[i + 2]);
            this.boundingBox.expandByPoint(new Vector3(tempVec3.x, tempVec3.y, tempVec3.z));

        }
    }

    public getGeometry(): Tile3DProjectedGeometry {
        return {
            type: 'projected',
            zIndex: this.zIndex,
            boundingBox: this.boundingBox,
            positionBuffer: new Float32Array(this.arrays.position),
            normalBuffer: new Float32Array(this.arrays.normal),
            uvBuffer: new Float32Array(this.arrays.uv),
            textureIdBuffer: new Uint8Array(this.arrays.textureId)
        };
    }

    public getTerrainMaskGeometry(): Tile3DTerrainMaskGeometry {
        return {
            type: 'mask',
            positionBuffer: new Float32Array(this.terrainMaskPositions)
        };
    }
}