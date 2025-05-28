import { Vector2, Vector3 } from "three";
import { BuildingFacadeMaterial, BuildingProperties, BuildingRoofMaterial, BuildingRoofType, PolygonOptions, RoofType, VectorArea, VectorAreaDescriptor, VectorNode } from "./type";
import { Coordinate, Feature, Polygon } from "../../ol-module";
import Earcut from 'earcut';
import Tile3DMultipolygon from "./tile3d-multipolygon";
import Tile3DRing, { Tile3DRingType, VectorAreaRing } from "./tile-3d-ring";
import { BuildingBuilder } from "./building-builder";
import { getRoofParams } from "./roof-params";
import { getOMBB } from "./ombb-params";
import { ExtrudedTextures } from "./roof/textures";
import { getBuildingParams } from "./building-params";
import { Tile3DFeaturesToBuffersConverter } from "./tile3d-features-to-buffers-converter";
import { getRoofTypeFromString } from "./roof/utils";
import Vec2 from "../math/vector2";
import Vec3 from "../math/vector3";


export enum VectorAreaRingType {
    Inner,
    Outer
}

const VERT_STRIDE = 3; // 3 elements per vertex position (X, Y, Z)
const X = 0;
const Y = 1;
const Z = 2;

const temp_vec2 = new Vector2()
/**
 * This methods prepares vertices for three.js with coordinates coming from openlayers.
 *
 * It does 2 things:
 *
 * - flatten the array while removing the last vertex of each rings
 * - builds the new hole indices taking into account vertex removals
 *
 * @param coordinates - The coordinate of the closed shape that form the roof.
 * @param stride - The stride in the coordinate array (2 for XY, 3 for XYZ)
 * @param offset - The offset to apply to vertex positions.
 * the first/last point
 * @param elevation - The elevation.
 */
export function createFloorVertices(
    coordinates: Array<Array<Array<number>>>,
    stride: number,
    offset: Vec3,
    elevation: Array<number> | number,
    ignoreZ: boolean,
) {
    // iterate on polygon and holes
    const holesIndices = [];
    let currentIndex = 0;
    const positions = [];
    for (const ring of coordinates) {
        // NOTE: rings coming from openlayers are auto-closing, so we need to remove the last vertex
        // of each ring here
        if (currentIndex > 0) {
            holesIndices.push(currentIndex);
        }
        for (let i = 0; i < ring.length - 1; i++) {
            currentIndex++;
            const coord = ring[i];
            positions.push(coord[X] - offset.x);
            positions.push(coord[Y] - offset.y);
            let z = 0;
            if (!ignoreZ) {
                if (stride === 3) {
                    z = coord[Z];
                } else if (elevation != null) {
                    z = Array.isArray(elevation) ? elevation[i] : elevation;
                }
            }
            z -= offset.z;
            positions.push(z);
        }
    }
    return { flatCoordinates: positions, holes: holesIndices };
}

/**
 * Create a roof, basically a copy of the floor with faces shifted by 'pointcount' elem
 *
 * NOTE: at the moment, this method must be executed before `createWallForRings`, because we copy
 * the indices array as it is.
 *
 * @param positions - a flat array of coordinates
 * @param pointCount - the number of points to read from position, starting with the first vertex
 * @param indices - the indices to duplicate for the roof
 * @param extrusionOffset - the extrusion offset(s) to apply to the roof element.
 */
export function createRoof(
    positions: Array<number>,
    pointCount: number,
    indices: Array<number>,
    extrusionOffset: Array<number> | number,
) {
    for (let i = 0; i < pointCount; i++) {
        positions.push(positions[i * VERT_STRIDE + X]);
        positions.push(positions[i * VERT_STRIDE + Y]);
        const zOffset = Array.isArray(extrusionOffset) ? extrusionOffset[i] : extrusionOffset;
        positions.push(positions[i * VERT_STRIDE + Z] + zOffset);
    }
    const iLength = indices.length;
    for (let i = 0; i < iLength; i++) {
        indices.push(indices[i] + pointCount);
    }
}

/**
* This methods creates vertex and faces for the walls
*
* @param positions - The array containing the positions of the vertices.
* @param start - vertex in positions to start with
* @param end - vertex in positions to end with
* @param indices - The index array.
* @param extrusionOffset - The extrusion distance.
*/
function createWallForRings(
    positions: Array<number>,
    start: number,
    end: number,
    indices: Array<number>,
    extrusionOffset: Array<number> | number,
) {
    // Each side is formed by the A, B, C, D vertices, where A is the current coordinate,
    // and B is the next coordinate (thus the segment AB is one side of the polygon).
    // C and D are the same points but with a Z offset.
    // Note that each side has its own vertices, as vertices of sides are not shared with
    // other sides (i.e duplicated) in order to have faceted normals for each side.
    let vertexOffset = 0;
    const pointCount = positions.length / 3;

    for (let i = start; i < end; i++) {
        const idxA = i * VERT_STRIDE;
        const iB = i + 1 === end ? start : i + 1;
        const idxB = iB * VERT_STRIDE;

        const Ax = positions[idxA + X];
        const Ay = positions[idxA + Y];
        const Az = positions[idxA + Z];

        const Bx = positions[idxB + X];
        const By = positions[idxB + Y];
        const Bz = positions[idxB + Z];

        const zOffsetA = Array.isArray(extrusionOffset) ? extrusionOffset[i] : extrusionOffset;
        const zOffsetB = Array.isArray(extrusionOffset) ? extrusionOffset[iB] : extrusionOffset;

        // +Z top
        //      A                    B
        // (Ax, Ay, zMax) ---- (Bx, By, zMax)
        //      |                    |
        //      |                    |
        // (Ax, Ay, zMin) ---- (Bx, By, zMin)
        //      C                    D
        // -Z bottom

        positions.push(Ax, Ay, Az); // A
        positions.push(Bx, By, Bz); // B
        positions.push(Ax, Ay, Az + zOffsetA); // C
        positions.push(Bx, By, Bz + zOffsetB); // D

        // The indices of the side are the following
        // [A, B, C, C, B, D] to form the two triangles.

        const A = 0;
        const B = 1;
        const C = 2;
        const D = 3;

        const idx = pointCount + vertexOffset;

        indices.push(idx + A);
        indices.push(idx + B);
        indices.push(idx + C);

        indices.push(idx + C);
        indices.push(idx + B);
        indices.push(idx + D);

        vertexOffset += 4;
    }
}

function createSurfaces(polygon: Polygon, options: PolygonOptions) {
    const stride = polygon.getStride();

    // First we compute the positions of the top vertices (that make the 'floor').
    // note that in some dataset, it's the roof and user needs to extrusionOffset down.
    const polyCoords = polygon.getCoordinates();

    const { flatCoordinates, holes } = createFloorVertices(
        polyCoords,
        stride,
        options.origin,
        options.elevation,
        options.ignoreZ,
    );

    const pointCount = flatCoordinates.length / 3;
    const floorPositionsCount = flatCoordinates.slice().length
    const triangles = Earcut(flatCoordinates, holes, 3);

    // if (options.extrusionOffset != null) {
    createRoof(flatCoordinates, pointCount, triangles, options.extrusionOffset);
    const roofPositionsCount = floorPositionsCount + (flatCoordinates.slice().length - floorPositionsCount)

    createWallForRings(
        flatCoordinates,
        0,
        holes[0] || pointCount,
        triangles,
        options.extrusionOffset,
    );

    for (let i = 0; i < holes.length; i++) {
        createWallForRings(
            flatCoordinates,
            holes[i],
            holes[i + 1] || pointCount,
            triangles,
            options.extrusionOffset,
        );
    }
    // }
    const floorPostions = []
    const roofPostions = []
    const wallPostions = []

    const isVerticesRoofOrFloor = flatCoordinates.map((coordinate, index) => {
        if (index < floorPositionsCount) {
            // is floor
            floorPostions.push(coordinate)
            return 0.0
        } else if (index < roofPositionsCount) {
            // is roof
            roofPostions.push(coordinate)
            return 2.0
        }
        // is wall
        wallPostions.push(coordinate)
        return 1.0
    })
    const positions = new Float32Array(flatCoordinates);

    const isPositionRoofOrFloor = new Float32Array(isVerticesRoofOrFloor);

    const indices =
        positions.length <= 65536 ? new Uint16Array(triangles) : new Uint32Array(triangles);

    return {
        positions, indices, isPositionRoofOrFloor, floorPostions,
        roofPostions,
        wallPostions
    };
}



// function isRingClockwise(coords: Array<Coordinate>) {
//     function rad(x) {
//         return x * Math.PI / 180;
//     }
//     var area = 0;
//     if (coords.length > 2) {
//         var p1, p2;
//         for (var i = 0; i < coords.length - 1; i++) {
//             p1 = coords[i];
//             p2 = coords[i + 1];
//             area += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
//         }
//     }

//     return area >= 0;
// }

export function isRingClockwise(ring: Array<Coordinate>): boolean {
    let sum = 0;

    for (let i = 0; i < ring.length; i++) {
        const point1 = ring[i];
        const point2 = ring[i + 1] ?? ring[0];
        sum += (point2[0] - point1[0]) * (point2[1] + point1[1]);
    }

    return sum < 0;
}


export function validateRing(ring: Array<Coordinate>): boolean {
    const first = ring[0];
    const last = ring[ring.length - 1];

    return first[0] === last[0] && first[1] === last[1];
}

export function inputRingToVectorRing(ring: Array<Coordinate>, type: VectorAreaRingType): VectorAreaRing {
    const isClockwise = isRingClockwise(ring);
    const type_ = isClockwise ? VectorAreaRingType.Outer : VectorAreaRingType.Inner;
    // const type = VectorAreaRingType.Outer
    type = type_
    const nodes: Array<VectorNode> = ring.map(([x, y]) => {
        return {
            type: 'node',
            x,
            y,
            rotation: 0,
            osmReference: null,
            descriptor: null
        };
    });

    return { type, nodes };
}



export function createBuildingPolygons(olFeatures: Feature<Polygon>[]) {
    const areas: VectorArea[] = [];

    for (let index = 0; index < olFeatures.length; index++) {
        const olFeature = olFeatures[index];
        const rings: VectorAreaRing[] = [];
        const coordinates = olFeature.getGeometry().getCoordinates()

        const firstRing = coordinates[0]
        let i = 0;
        for (const ring of coordinates) {
            if (!validateRing(ring)) {
                i++
                throw new Error('Invalid PBF ring');
            }
            let type = VectorAreaRingType.Inner;
            if (i == 0) {
                type = VectorAreaRingType.Outer;
            }

            const vectorRing = inputRingToVectorRing(ring, type);
            rings.push(vectorRing);
            i++
        }

        for (const ring of rings) {
            if (ring.type === VectorAreaRingType.Outer) {

                areas.push({
                    type: 'area',
                    rings: [ring],
                    osmReference: olFeature.getProperties()["osmId"],
                    descriptor: {
                        type: 'building',
                        ombb: getOMBB(olFeature.getProperties() as BuildingProperties),
                        ...getBuildingParams(olFeature.getProperties() as BuildingProperties)
                    }
                });
            } else {
                if (!areas[areas.length - 1]) {
                    throw new Error('Invalid ring order');
                }

                areas[areas.length - 1].rings.push(ring);
            }
        }
    }


    return areas

}

const TERRAINMAXHEIGHT = 0;
const TERRAINMINHEIGHT = 0

export class Builder {


    multipolygon: Tile3DMultipolygon
    rings: Array<VectorAreaRing>
    // rings: Array<Tile3DRing>
    private mercatorScale: number = 1.52122668;
    descriptor: VectorAreaDescriptor
    feature: VectorArea
    constructor(
        feature: VectorArea
    ) {
        this.feature = feature
        this.descriptor = feature.descriptor;
        this.rings = feature.rings;
    }



    public getMultipolygon(): Tile3DMultipolygon {
        if (this.multipolygon == undefined) {
            this.multipolygon = new Tile3DMultipolygon();

            for (const ring of this.rings) {
                const type = ring.type === VectorAreaRingType.Inner ? Tile3DRingType.Inner : Tile3DRingType.Outer;

                const nodes = ring.nodes.map(node => {

                    return new Vec2(node.x, node.y)
                });

                this.multipolygon.addRing(new Tile3DRing(type, nodes));
            }

            // if (this.descriptor.ombb) {
            //     this.multipolygon.setOMBB(this.descriptor.ombb);
            // }

            // if (this.descriptor.poi) {
            //     this.multipolygon.setPoleOfInaccessibility(this.descriptor.poi);
            // }
        }

        return this.multipolygon;
    }

    // test() {
    //     const multipolygon = this.getMultipolygon();
    //     let builder = new BuildingBuilder(multipolygon)
    //     const noDefaultRoof = builder.getAreaToOMBBRatio() < 0.75 || multipolygon.getArea() < 10;
    //     const roofParams = this.getRoofParams(noDefaultRoof);
    //     const facadeMinHeight = this.descriptor.buildingFoundation ? TERRAINMAXHEIGHT : TERRAINMINHEIGHT;

    //     const { skirt, facadeHeightOverride } = builder.addRoof({
    //         terrainHeight: facadeMinHeight,
    //         type: roofParams.type,
    //         buildingHeight: this.descriptor.buildingHeight,
    //         minHeight: this.descriptor.buildingHeight - this.descriptor.buildingRoofHeight,
    //         height: this.descriptor.buildingRoofHeight,
    //         direction: this.descriptor.buildingRoofDirection,
    //         orientation: this.descriptor.buildingRoofOrientation,
    //         angle: this.descriptor.buildingRoofAngle,
    //         textureId: roofParams.textureId,
    //         color: roofParams.color,
    //         scaleX: roofParams.scaleX,
    //         scaleY: roofParams.scaleY,
    //         isStretched: roofParams.isStretched,
    //         flip: false
    //     });

    //     const facadeParams = this.getFacadeParams();

    //     builder.addWalls({
    //         terrainHeight: facadeMinHeight,
    //         levels: this.descriptor.buildingLevels,
    //         windowWidth: facadeParams.windowWidth,
    //         minHeight: this.descriptor.buildingMinHeight,
    //         height: facadeHeightOverride ?? (this.descriptor.buildingHeight - this.descriptor.buildingRoofHeight),
    //         skirt: skirt,
    //         color: facadeParams.color,
    //         textureIdWall: facadeParams.textureIdWall,
    //         textureIdWindow: facadeParams.textureIdWindow,
    //         windowSeed: null
    //     });

    // }
    private handleBuilding() {
        const multipolygon = this.getMultipolygon();

        let builder = new BuildingBuilder(multipolygon)
        const noDefaultRoof = builder.getAreaToOMBBRatio() < 0.75 || multipolygon.getArea() < 10;

        const roofParams = this.getRoofParams(noDefaultRoof, this.descriptor.buildingHeight == 4);
        // const roofParams = this.getTemporaryRoofParams(this.descriptor.buildingHeight == 4);

        const facadeMinHeight = this.descriptor.buildingFoundation ? TERRAINMAXHEIGHT : TERRAINMINHEIGHT;
        const foundationHeight = TERRAINMAXHEIGHT - TERRAINMINHEIGHT;


        const { skirt, facadeHeightOverride } = builder.addRoof({
            terrainHeight: facadeMinHeight,
            type: roofParams.type,
            buildingHeight: this.descriptor.buildingHeight,
            minHeight: this.descriptor.buildingHeight - this.descriptor.buildingRoofHeight,
            height: this.descriptor.buildingRoofHeight,
            direction: this.descriptor.buildingRoofDirection,
            orientation: this.descriptor.buildingRoofOrientation,
            angle: this.descriptor.buildingRoofAngle,
            textureId: roofParams.textureId,
            color: roofParams.color,
            scaleX: roofParams.scaleX,
            scaleY: roofParams.scaleY,
            isStretched: roofParams.isStretched,
            flip: false
        });

        const facadeParams = this.getFacadeParams();

        builder.addWalls({
            terrainHeight: facadeMinHeight,
            levels: this.descriptor.buildingLevels,
            windowWidth: facadeParams.windowWidth,
            minHeight: this.descriptor.buildingMinHeight,
            height: facadeHeightOverride ?? (this.descriptor.buildingHeight - this.descriptor.buildingRoofHeight),
            skirt: skirt,
            color: facadeParams.color,
            textureIdWall: facadeParams.textureIdWall,
            textureIdWindow: facadeParams.textureIdWindow,
            windowSeed: null
        });

        if (this.descriptor.buildingFoundation && foundationHeight > 0.5) {
            builder.addWalls({
                terrainHeight: TERRAINMINHEIGHT,
                levels: foundationHeight / 4,
                windowWidth: facadeParams.windowWidth,
                minHeight: 0,
                height: TERRAINMAXHEIGHT - TERRAINMINHEIGHT,
                skirt: null,
                color: facadeParams.color,
                textureIdWall: facadeParams.textureIdWall,
                textureIdWindow: facadeParams.textureIdWall,
                windowSeed: null
            });
        }

        let features = [
            builder.getGeometry(),
            builder.getTerrainMaskGeometry()
        ];

        if (this.descriptor.label) {
            const pole = this.getMultipolygon().getPoleOfInaccessibility();
            const height = facadeMinHeight + this.descriptor.buildingHeight + 5;
            const labelFeature = {
                type: 'label',
                position: [pole.x, height, pole.y],
                priority: pole.z,
                text: this.descriptor.label
            };

            features.push(labelFeature as any);
        }

        return features;

    }

    getFeatures() {
        const collection = {
            extruded: [],
            projected: [],
            hugging: [],
            terrainMask: [],
            labels: [],
            instances: []
        };

        const output = this.handleBuilding()

        if (output) {
            for (const feature of output) {
                if (feature === null) {
                    continue;
                }
                switch (feature.type) {
                    case 'instance':
                        collection.instances.push(feature);
                        break;
                    case 'projected':
                        collection.projected.push(feature);
                        break;
                    case 'extruded':
                        collection.extruded.push(feature);
                        break;
                    case 'hugging':
                        collection.hugging.push(feature);
                        break;
                    case 'mask':
                        collection.terrainMask.push(feature);
                        break;
                    case 'label':
                        collection.labels.push(feature);
                        break;
                }
            }
        }
        const buffers = Tile3DFeaturesToBuffersConverter.convert(collection)
        return buffers
    }

    // public static convert(collection) {
    // 	return {
    // 		extruded: this.getExtrudedBuffers(collection.extruded),
    // 		projected: this.getProjectedBuffers(collection.projected),
    // 		hugging: this.getHuggingBuffers(collection.hugging),
    // 		terrainMask: this.getTerrainMaskBuffers(collection.terrainMask, collection.zoom),
    // 		labels: this.getLabelsBuffers(collection.labels),
    // 		instances: this.getInstanceBuffers(collection.instances)
    // 	};
    // }

    private getTemporaryRoofParams(forceConcrete: boolean): {
        type: RoofType;
        textureId: number;
        color: number;
        scaleX: number;
        scaleY: number;
        isStretched: boolean;
    } {

        const roofType = getRoofTypeFromString(this.descriptor.buildingRoofType);
        const roofMaterial = this.descriptor.buildingRoofMaterial;
        let roofColor = this.descriptor.buildingRoofColor;

        const textureIdToScale: Record<number, Vector2> = {
            [ExtrudedTextures.RoofTiles]: new Vector2(3, 3),
            [ExtrudedTextures.RoofMetal]: new Vector2(4, 4),
            [ExtrudedTextures.RoofConcrete]: new Vector2(10, 10),
            [ExtrudedTextures.RoofThatch]: new Vector2(8, 8),
            [ExtrudedTextures.RoofEternit]: new Vector2(5, 5),
            [ExtrudedTextures.RoofGrass]: new Vector2(12, 12),
            [ExtrudedTextures.RoofGlass]: new Vector2(4, 4),
            [ExtrudedTextures.RoofTar]: new Vector2(4, 4),
        };


        if (forceConcrete) {
            const scale = textureIdToScale[ExtrudedTextures.RoofConcrete]
            return {
                type: roofType,
                textureId: ExtrudedTextures.RoofConcrete,
                color: roofColor,
                scaleX: scale.x,
                scaleY: scale.y,
                isStretched: false
            }
        } else {
            return {
                type: roofType,
                textureId: ExtrudedTextures.RoofGeneric3,
                color: roofColor,
                scaleX: 32,
                scaleY: 32,
                isStretched: false
            };
        }

    }

    private getRoofParams(noDefaultRoof: boolean, buildingWithOneLevel: boolean = false): {
        type: RoofType;
        textureId: number;
        color: number;
        scaleX: number;
        scaleY: number;
        isStretched: boolean;
    } {
        const roofType = getRoofTypeFromString(this.descriptor.buildingRoofType);
        const roofMaterial = this.descriptor.buildingRoofMaterial;
        let roofColor = this.descriptor.buildingRoofColor;

        const materialToTextureId: Record<BuildingRoofMaterial, number> = {
            default: ExtrudedTextures.RoofConcrete,
            tiles: ExtrudedTextures.RoofTiles,
            metal: ExtrudedTextures.RoofMetal,
            concrete: ExtrudedTextures.RoofConcrete,
            thatch: ExtrudedTextures.RoofThatch,
            eternit: ExtrudedTextures.RoofEternit,
            grass: ExtrudedTextures.RoofGrass,
            glass: ExtrudedTextures.RoofGlass,
            tar: ExtrudedTextures.RoofTar
        };
        const textureIdToScale: Record<number, Vector2> = {
            [ExtrudedTextures.RoofTiles]: new Vector2(3, 3),
            [ExtrudedTextures.RoofMetal]: new Vector2(4, 4),
            [ExtrudedTextures.RoofConcrete]: new Vector2(10, 10),
            [ExtrudedTextures.RoofThatch]: new Vector2(8, 8),
            [ExtrudedTextures.RoofEternit]: new Vector2(5, 5),
            [ExtrudedTextures.RoofGrass]: new Vector2(12, 12),
            [ExtrudedTextures.RoofGlass]: new Vector2(4, 4),
            [ExtrudedTextures.RoofTar]: new Vector2(4, 4),
        };
        const scaleFactor = 1
        if (buildingWithOneLevel) {
            let id = ExtrudedTextures.RoofConcrete
            let scale = textureIdToScale[id]
            return {
                type: roofType,
                textureId: id,
                color: roofColor,
                scaleX: scale.x * scaleFactor,
                scaleY: scale.y * scaleFactor,
                isStretched: false
            };
        }




        if (roofType === RoofType.Flat && roofMaterial === 'default' && !noDefaultRoof) {
            const defaultTextures = [
                ExtrudedTextures.RoofGeneric1,
                ExtrudedTextures.RoofGeneric2,
                ExtrudedTextures.RoofGeneric3,
                ExtrudedTextures.RoofGeneric4
            ];

            return {
                type: roofType,
                // textureId: defaultTextures[(this.osmReference.id || 0) % defaultTextures.length],
                textureId: defaultTextures[2],
                color: roofColor,
                scaleX: 32 * scaleFactor,
                scaleY: 32 * scaleFactor,
                isStretched: false
            };
        }

        if (noDefaultRoof && roofMaterial === 'default') {
            roofColor = 0xBBBBBB;
        }

        let id = materialToTextureId[roofMaterial];
        let scale = textureIdToScale[id] ?? new Vector2(1, 1);

        return {
            type: roofType,
            textureId: id,
            color: roofColor,
            scaleX: scale.x * scaleFactor,
            scaleY: scale.y * scaleFactor,
            isStretched: false
        };
    }
    // "@giro3d/giro3d": "file:../../giro3d_gitlab/giro3d-giro3d-0.37.3.tgz",



    private getFacadeParams(): {
        windowWidth: number;
        color: number;
        textureIdWindow: number;
        textureIdWall: number;
    } {
        const material = this.descriptor.buildingFacadeMaterial;
        let color = this.descriptor.buildingFacadeColor;
        const hasWindows = this.descriptor.buildingWindows;

        const materialToTextureId: Record<BuildingFacadeMaterial, {
            wall: number;
            window: number;
            width: number;
        }> = {
            plaster: {
                wall: ExtrudedTextures.FacadePlasterWall,
                window: ExtrudedTextures.FacadePlasterWindow,
                width: 4
            },
            glass: {
                wall: ExtrudedTextures.FacadeGlass,
                window: ExtrudedTextures.FacadeGlass,
                width: 4
            },
            brick: {
                wall: ExtrudedTextures.FacadeBrickWall,
                window: ExtrudedTextures.FacadeBrickWindow,
                width: 4
            },
            wood: {
                wall: ExtrudedTextures.FacadeWoodWall,
                window: ExtrudedTextures.FacadeWoodWindow,
                width: 4
            },
            cementBlock: {
                wall: ExtrudedTextures.FacadeBlockWall,
                window: ExtrudedTextures.FacadeBlockWindow,
                width: 4
            }
        };

        const params = materialToTextureId[material] ?? materialToTextureId.cementBlock;
        // const params = materialToTextureId.cementBlock
        return {
            windowWidth: params.width * this.mercatorScale,
            color,
            textureIdWall: params.wall,
            textureIdWindow: hasWindows ? params.window : params.wall
        };
    }



}
