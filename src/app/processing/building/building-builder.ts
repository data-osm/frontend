import { Box3, Vector3 } from "three";
import FlatRoofBuilder from "./roof/flat-roof-builders";
// import SkillionRoofBuilder from "./roof/skillion-roof-builder";
import { RoofBuilder, RoofGeometry, RoofParams, RoofSkirt } from "./roof/type";
import { getPolygonAreaSigned } from "./roof/utils";
import Tile3DMultipolygon from "./tile3d-multipolygon";
import { RoofType } from "./type";
import WallsBuilder from "./walls-builder";
import { ExtrudedTextures } from "./roof/textures";
import { MathUtils } from "three/src/math/MathUtils";
import Vec2 from "../math/vector2";
import SkillionRoofBuilder from "./roof/skillion-roof-builder";
import OrientedGabledRoofBuilder from "./oriented-gabled-roof-builder";
import GabledRoofBuilder from "./roof/gabled-roof-builder";
import HippedRoofBuilder from "./roof/hipped-roof-builder";
import OnionRoofBuilder from "./roof/onion-roof-builder";
import PyramidalRoofBuilder from "./pyramidal-roof-builder";
import DomeRoofBuilder from "./roof/dome-roof-builder";
import OrientedGambrelRoofBuilder from "./roof/oriented-gambrel-roof-builder";
import GambrelRoofBuilder from "./roof/gambrel-roof-builder";
import MansardRoofBuilder from "./roof/mansard-roof-builder";
import OrientedRoundRoofBuilder from "./roof/oriented-round-roof-builder";
import QuadrupleSaltboxRoofBuilder from "./roof/quadruple-saltbox-roof-builder";
import OrientedSaltboxRoofBuilder from "./roof/oriented-saltbox-roof-builder";

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


export function colorToComponents(color: number): [number, number, number] {
    return [
        color >> 16,
        color >> 8 & 0xff,
        color & 0xff
    ];
}

export default class SeededRandom {
    private seed: number;

    public constructor(seed: number) {
        this.seed = seed || 0x2F6E2B1;
    }

    public generate(): number {
        // Robert Jenkins’ 32-bit integer hash function
        this.seed = ((this.seed + 0x7ED55D16) + (this.seed << 12)) & 0xFFFFFFFF;
        this.seed = ((this.seed ^ 0xC761C23C) ^ (this.seed >>> 19)) & 0xFFFFFFFF;
        this.seed = ((this.seed + 0x165667B1) + (this.seed << 5)) & 0xFFFFFFFF;
        this.seed = ((this.seed + 0xD3A2646C) ^ (this.seed << 9)) & 0xFFFFFFFF;
        this.seed = ((this.seed + 0xFD7046C5) + (this.seed << 3)) & 0xFFFFFFFF;
        this.seed = ((this.seed ^ 0xB55A4F09) ^ (this.seed >>> 16)) & 0xFFFFFFFF;
        return (this.seed & 0xFFFFFFF) / 0x10000000;
    }
}


export class BuildingBuilder {

    multipolygon: Tile3DMultipolygon
    private readonly terrainMaskPositions: number[] = [];
    box: Box3 = new Box3()

    private readonly arrays: {
        position: number[];
        uv: number[];
        normal: number[];
        textureId: number[];
        color: number[];
    } = {
            position: [],
            uv: [],
            normal: [],
            textureId: [],
            color: []
        };

    constructor(multipolygon: Tile3DMultipolygon) {
        this.multipolygon = multipolygon
    }


    public addRoof(params: {
        terrainHeight: number;
        type: RoofType;
        buildingHeight: number;
        minHeight: number;
        height: number;
        direction: number;
        angle: number;
        orientation: 'along' | 'across';
        color: number;
        textureId: number;
        scaleX: number;
        scaleY: number;
        isStretched: boolean;
        flip: boolean;
    }): { skirt?: RoofSkirt; facadeHeightOverride?: number } {
        let builder: RoofBuilder;

        switch (params.type) {
            case RoofType.Skillion: {
                builder = new SkillionRoofBuilder();
                break;
            }
            case RoofType.Pyramidal: {
                builder = new PyramidalRoofBuilder();
                break;
            }
            case RoofType.Onion: {
                builder = new OnionRoofBuilder();
                break;
            }
            case RoofType.Dome: {
                builder = new DomeRoofBuilder();
                break;
            }
            case RoofType.Hipped: {
                builder = new HippedRoofBuilder();
                break;
            }
            case RoofType.Gabled: {
                if (params.orientation === 'along' || params.orientation === 'across') {
                    // builder = new OrientedGabledRoofBuilder();
                    builder = new GabledRoofBuilder();
                } else {
                    builder = new GabledRoofBuilder();
                }
                break;
            }
            case RoofType.Gambrel: {
                if (params.orientation === 'along' || params.orientation === 'across') {
                    builder = new OrientedGambrelRoofBuilder();
                } else {
                    builder = new GambrelRoofBuilder();
                }
                break;
            }
            case RoofType.Mansard: {
                builder = new MansardRoofBuilder();
                break;
            }
            case RoofType.Round: {
                if (!params.orientation) {
                    params.orientation = 'along';
                }

                builder = new OrientedRoundRoofBuilder();

                break;
            }
            case RoofType.QuadrupleSaltbox: {
                builder = new QuadrupleSaltboxRoofBuilder();
                break;
            }
            case RoofType.Saltbox: {
                if (params.direction === null) {
                    params.orientation = 'along';
                }

                builder = new OrientedSaltboxRoofBuilder();
                break;
            }
            default: {
                builder = new FlatRoofBuilder();
                break;
            }
        }

        const roof = this.buildRoofSafe(builder, {
            multipolygon: this.multipolygon,
            ...params
        });


        this.addAndPaintGeometry({
            position: roof.position,
            normal: roof.normal,
            uv: roof.uv,
            color: params.color,
            textureId: params.textureId,
            heightOffset: params.terrainHeight
        });

        return {
            skirt: roof.addSkirt ? roof.skirt : null,
            facadeHeightOverride: roof.facadeHeightOverride
        };
    }

    public addWalls(
        {
            terrainHeight,
            minHeight,
            height,
            skirt,
            levels,
            windowWidth,
            color,
            textureIdWindow,
            textureIdWall,
            windowSeed
        }: {
            terrainHeight: number;
            minHeight: number;
            height: number;
            skirt: RoofSkirt;
            levels: number;
            windowWidth: number;
            color: number;
            textureIdWindow: number;
            textureIdWall: number;
            windowSeed: number;
        }
    ): void {
        const noWalls = minHeight >= height;
        if (skirt) {
            for (const { points, hasWindows } of skirt) {
                const vertices = points.map(point => point.position);
                const heights = points.map(point => point.height);

                let skirtPartMaxHeight = 0;

                for (const height of heights) {
                    skirtPartMaxHeight = Math.max(skirtPartMaxHeight, height);
                }

                let levelHeight = (height - minHeight) / levels;

                if (levelHeight < 0.01 || levels === 0) {
                    levelHeight = 4;
                }

                let skirtLevels = (skirtPartMaxHeight - height) / levelHeight;

                if (hasWindows && skirtLevels > 0.5) {
                    skirtLevels = Math.round(skirtLevels);
                }

                const walls = WallsBuilder.build({
                    vertices,
                    minHeight: height,
                    height: skirtPartMaxHeight,
                    heightPoints: heights,
                    levels: skirtLevels,
                    windowWidth,
                    textureIdWall,
                    textureIdWindow: hasWindows ? textureIdWindow : textureIdWall
                });



                this.addAndPaintGeometry({
                    position: walls.position,
                    normal: walls.normal,
                    uv: walls.uv,
                    color,
                    textureId: walls.textureId,
                    heightOffset: terrainHeight
                });
            }
        }



        if (!noWalls) {
            const rng = new SeededRandom(windowSeed);

            for (const ring of this.multipolygon.rings) {
                const uvOffset = new Vec2(
                    Math.floor(rng.generate() * 256),
                    Math.floor(rng.generate() * 256)
                );


                const walls = WallsBuilder.build({
                    vertices: ring.nodes,
                    minHeight,
                    height: height,
                    levels,
                    windowWidth,
                    textureIdWall,
                    textureIdWindow,
                    uvOffset
                });


                this.addAndPaintGeometry({
                    position: walls.position,
                    normal: walls.normal,
                    uv: walls.uv,
                    color,
                    textureId: walls.textureId,
                    heightOffset: terrainHeight
                });
            }
        }

        if (minHeight > 0) {
            const roof = new FlatRoofBuilder().build({
                multipolygon: this.multipolygon,
                buildingHeight: minHeight,
                height: 0,
                minHeight: minHeight,
                flip: true,
                direction: 0,
                angle: 0,
                orientation: null,
                scaleX: 10,
                scaleY: 10,
                isStretched: false
            });

            this.addAndPaintGeometry({
                position: roof.position,
                normal: roof.normal,
                uv: roof.uv,
                color,
                textureId: ExtrudedTextures.RoofConcrete,
                heightOffset: terrainHeight
            });
        } else {
            const footprint = this.multipolygon.getFootprint({
                height: 0,
                flip: false
            });

            this.addMaskGeometry(footprint.positions);
        }
    }

    private addMaskGeometry(position: number[]): void {
        for (let i = 0; i < position.length; i += 3) {
            this.terrainMaskPositions.push(position[i], position[i + 2]);
        }
    }

    private buildRoofSafe(builder: RoofBuilder, params: RoofParams): RoofGeometry {
        let roof = builder.build(params);

        if (roof === null/* || !RoofGeometryValidator.validate(roof, params.multipolygon)*/) {
            roof = new FlatRoofBuilder().build(params);
        }

        return roof;
    }

    public getAreaToOMBBRatio(): number {
        const ombb = this.multipolygon.getOMBB();
        const ombbArea = getPolygonAreaSigned(ombb);
        const multipolygonArea = this.multipolygon.getArea();

        return multipolygonArea / ombbArea;
    }

    private applyHeightOffsetToVertices(vertices: number[], heightOffset: number): void {
        for (let i = 1; i < vertices.length; i += 3) {
            vertices[i] += heightOffset;
        }
    }

    private addVerticesToBoundingBox(vertices: number[]): void {
        const tempVec3 = new Vector3();

        for (let i = 0; i < vertices.length; i += 3) {
            tempVec3.set(vertices[i], vertices[i + 1], vertices[i + 2]);
            this.box.expandByPoint(tempVec3);
        }
    }

    private addAndPaintGeometry(
        {
            position,
            normal,
            uv,
            color,
            textureId,
            heightOffset
        }: {
            position: number[];
            normal: number[];
            uv: number[];
            color: number;
            textureId: number | number[];
            heightOffset: number;
        }
    ): void {
        this.applyHeightOffsetToVertices(position, heightOffset);
        this.addVerticesToBoundingBox(position);

        let shouldPushTextureId = true;

        appendArrayInPlace(this.arrays.position, position);
        appendArrayInPlace(this.arrays.normal, normal);
        appendArrayInPlace(this.arrays.uv, uv);

        if (typeof textureId !== 'number') {
            this.arrays.textureId.push(...textureId);
            shouldPushTextureId = false;
        }

        const vertexCount = position.length / 3;
        const colorComponents = colorToComponents(color);

        for (let i = 0; i < vertexCount; i++) {
            this.arrays.color.push(...colorComponents);

            if (shouldPushTextureId) {
                this.arrays.textureId.push(textureId as number);
            }
        }
    }

    public shiftLeft(num: number, bits: number): number {
        return num * Math.pow(2, bits);
    }

    public shiftRight(num: number, bits: number): number {
        return Math.floor(num / Math.pow(2, bits));
    }

    private getIDBuffer(): Uint32Array {
        const idBuffer = new Uint32Array(2);
        const osmType = "OSMReferenceType.Way";
        const osmId = 0

        // if (osmType === "OSMReferenceType.Way" || osmType === OSMReferenceType.Relation) {
        // const typeInt = osmType === OSMReferenceType.Way ? 0 : 1;
        const typeInt = 0;
        idBuffer[0] = Math.min(osmId, 0xffffffff);
        idBuffer[1] = this.shiftLeft(typeInt, 19) + this.shiftRight(typeInt, 32);
        // }

        return idBuffer;
    }

    public getGeometry() {
        return {
            type: 'extruded',
            boundingBox: this.box,
            positionBuffer: new Float32Array(this.arrays.position),
            normalBuffer: new Float32Array(this.arrays.normal),
            uvBuffer: new Float32Array(this.arrays.uv),
            textureIdBuffer: new Uint8Array(this.arrays.textureId),
            colorBuffer: new Uint8Array(this.arrays.color),
            idBuffer: this.getIDBuffer()
        };
    }

    public getTerrainMaskGeometry() {
        return {
            type: 'mask',
            positionBuffer: new Float32Array(this.terrainMaskPositions)
        };
    }


}