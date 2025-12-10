import { Coordinate } from "ol/coordinate";
import { LineString, MultiLineString } from "ol/geom";
import { Box3, BufferGeometry, BufferAttribute } from "three";
import { flipTriangleWindingNonIndexed } from "../build3dBuilding";

import { Tile3DProjectedGeometry, Tile3DHuggingGeometry, Tile3DProjectedGeometryBuilder } from "../polygon/tile3d-projected-geometry-builder";
import { ExtrudedLineTile, ExtrudedTile } from "../building-processing-worker/worker-packer";
import { VectorAreaRingType } from "../building/builder";
import { Tile3DRingType } from "../building/tile-3d-ring";
import { Tile3DFeaturesToBuffersConverter } from "../building/tile3d-features-to-buffers-converter";
import Tile3DMultipolygon from "../building/tile3d-multipolygon";
import { VectorAreaDescriptor, SourceLineFeature, VectorPolyline, SurfaceVectorLineDescriptor, VectorPolylineDescriptor, VectorNode, ProjectedTextures, ZIndexMap } from "../building/type";
import Vec2 from "../math/vector2";
import { RoadSide } from "./line-builder";
import Intersection, { IntersectionDirection } from "./road-graph/Intersection";
import Road from "./road-graph/Road";
import RoadGraph from "./road-graph/RoadGraph";
import { parseMeters, parseHeight } from "./utils";
import { PolygonBuilder } from "../polygon/generate-polygon-geometries";
import Vec3 from "../math/vector3";
import { LinesStringWithZ, MultiLineStringWithZ } from "../utils";

const tmpBox3 = new Box3()
const mercatorScale: number = 1.52122668;


function getIntersectionMaterial(
    intersection: Intersection,
    materialsMap: Map<Road, VectorAreaDescriptor['intersectionMaterial']>
): VectorAreaDescriptor['intersectionMaterial'] | null {
    const frequencyTable: Record<VectorAreaDescriptor['intersectionMaterial'], number> = {
        asphalt: 0,
        concrete: 0,
        cobblestone: 0
    };
    let total: number = 0;

    for (const dir of intersection.directions) {
        const material = materialsMap.get(dir.road);

        if (material !== null) {
            ++frequencyTable[material];
            ++total;
        }
    }

    if (total < 3) {
        return null;
    }

    const sorted = Object.entries(frequencyTable).sort((a, b) => b[1] - a[1]);

    if (sorted[0][1] === 0) {
        return null;
    }

    return sorted[0][0] as VectorAreaDescriptor['intersectionMaterial'];
}

function addIntersectionPolygonsToHandlers(
    graph: RoadGraph,
    handlers: (LineSurfaceBuilder | PolygonBuilder)[],
    intersectionMaterials: Map<Road, VectorAreaDescriptor['intersectionMaterial']>,
    segment, tileSize
): void {
    const intersectionPolygons = graph.buildIntersectionPolygons(0);

    for (const { intersection, polygon } of intersectionPolygons) {
        const material = getIntersectionMaterial(intersection, intersectionMaterials);
        console.log(polygon, material)
        if (material === null) {
            // Skip intersection if it has no material
            intersection.userData.skip = true;
            continue;
        }

        polygon.push(polygon[0]);
        polygon.reverse();


        handlers.push(
            new PolygonBuilder({
                type: 'area',
                osmReference: null,
                descriptor: {
                    type: 'roadwayIntersection',
                    intersectionMaterial: material
                },
                rings: [{
                    nodes: polygon.map(p => {
                        return {
                            type: 'node',
                            osmReference: null,
                            descriptor: null,
                            x: p.x,
                            y: p.y,
                            rotation: 0
                        };
                    }),
                    type: VectorAreaRingType.Outer
                }],
                elevation: 0
            }, segment, tileSize,)
        )



    }
}

export function generateLineGeometries(renderFeatures: SourceLineFeature[], worldBuildingPosition: [number, number, number], graph: RoadGraph, segment, tileSize): ExtrudedLineTile {

    if (renderFeatures.length == 0) {
        return undefined
    }


    const lineVectorAreas = createLineStringVector(renderFeatures, worldBuildingPosition)

    const builders: (LineSurfaceBuilder | PolygonBuilder)[] = []

    const roadIntersectionMaterials = new Map<Road, VectorAreaDescriptor['intersectionMaterial']>();
    for (let index = 0; index < lineVectorAreas.length; index++) {
        const element = lineVectorAreas[index];
        const builder = new LineSurfaceBuilder(segment, tileSize, element);

        builder.setRoadGraph(graph);
        const road = builder.getGraphRoad();

        if (road !== null) {
            roadIntersectionMaterials.set(road, builder.getIntersectionMaterial());
        }
        builders.push(builder);

    }

    graph.initIntersections();
    addIntersectionPolygonsToHandlers(graph, builders, roadIntersectionMaterials, segment, tileSize);

    let projectedFeatures: Tile3DProjectedGeometry[] = []
    let huggingFeatures: Tile3DHuggingGeometry[] = []
    for (let index = 0; index < builders.length; index++) {
        const builder = builders[index];
        const geometries = builder.getFeatures()
        geometries.map((geom) => {
            if (geom.type === "projected") {
                projectedFeatures.push(geom)
            } else if (geom.type == "hugging") {
                huggingFeatures.push(geom)
            }
        })
    }

    if (projectedFeatures.length == 0 && huggingFeatures.length == 0) {
        return undefined
    }



    let projectedGeometries = Tile3DFeaturesToBuffersConverter.getProjectedBuffers(projectedFeatures)
    let huggingGeometries = Tile3DFeaturesToBuffersConverter.getProjectedBuffers(huggingFeatures)

    if (projectedGeometries.positionBuffer.length == 0 && huggingGeometries.positionBuffer.length == 0) {
        return undefined
    }

    const projectedGeometry = new BufferGeometry();
    projectedGeometry.setAttribute("position", new BufferAttribute((projectedGeometries.positionBuffer as Float32Array), 3))
    projectedGeometry.setAttribute("normal", new BufferAttribute((projectedGeometries.normalBuffer as Float32Array), 3))
    projectedGeometry.setAttribute("uv", new BufferAttribute((projectedGeometries.uvBuffer as Float32Array), 2))
    projectedGeometry.setAttribute("textureId", new BufferAttribute((projectedGeometries.textureIdBuffer as Uint8Array), 1))
    projectedGeometry.setAttribute("zIndex", new BufferAttribute((projectedGeometries.zIndexBuffers as Uint8Array), 1))
    projectedGeometry.computeVertexNormals()
    flipTriangleWindingNonIndexed(projectedGeometry)

    const huggingGeometry = new BufferGeometry();
    huggingGeometry.setAttribute("position", new BufferAttribute((huggingGeometries.positionBuffer as Float32Array), 3))
    huggingGeometry.setAttribute("normal", new BufferAttribute((huggingGeometries.normalBuffer as Float32Array), 3))
    huggingGeometry.setAttribute("uv", new BufferAttribute((huggingGeometries.uvBuffer as Float32Array), 2))
    huggingGeometry.setAttribute("textureId", new BufferAttribute((huggingGeometries.textureIdBuffer as Uint8Array), 1))
    huggingGeometry.setAttribute("zIndex", new BufferAttribute((huggingGeometries.zIndexBuffers as Uint8Array), 1))
    huggingGeometry.computeVertexNormals()
    flipTriangleWindingNonIndexed(huggingGeometry)


    const result = {}
    if (projectedGeometries.positionBuffer.length > 0) {
        tmpBox3.setFromArray(projectedGeometry.attributes.position.array)
        const geometriesJson = Object.keys(projectedGeometry.attributes).map((key) => {

            return {
                "key": key,
                "data": projectedGeometry.attributes[key].toJSON()
            }
        })

        result["projectedGeometry"] = {
            "boundingBoxMinMax": [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z],
            worldBuildingPosition: worldBuildingPosition,
            "geometriesJson": geometriesJson
        }
    }
    if (huggingGeometries.positionBuffer.length > 0) {
        tmpBox3.setFromArray(huggingGeometry.attributes.position.array)
        const geometriesJson = Object.keys(huggingGeometry.attributes).map((key) => {

            return {
                "key": key,
                "data": huggingGeometry.attributes[key].toJSON()
            }
        })

        result["huggingGeometry"] = {
            "boundingBoxMinMax": [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z],
            worldBuildingPosition: worldBuildingPosition,
            "geometriesJson": geometriesJson
        }
    }
    return result
}

function createLineStringVector(olFeatures: SourceLineFeature[], worldBuildingPosition: [number, number, number]): VectorPolyline[] {
    const lines: VectorPolyline[] = [];

    function computeLineStringProperties(properties: SurfaceVectorLineDescriptor): VectorPolylineDescriptor {

        function getFenceMaterialFromOSMType(
            type: string
        ): {
            material: VectorPolylineDescriptor['fenceMaterial'];
            defaultHeight: number;
        } {

            const lookup: Record<string, [VectorPolylineDescriptor['fenceMaterial'], number]> = {
                wood: ['wood', 2],
                chain_link: ['chainLink', 3],
                wire: ['chainLink', 3],
                metal: ['metal', 1.5],
                railing: ['metal', 1.5],
                concrete: ['concrete', 2.5],
            };
            const entry = lookup[type] ?? lookup.metal;

            return {
                material: entry[0],
                defaultHeight: entry[1],
            };
        }

        if (properties.type == "path") {

            // const material = ProjectedTextures[properties.surface] ?? ProjectedTextures.DirtRoad;
            const prop: VectorPolylineDescriptor = {
                osm_id: properties.osm_id,
                type: 'path',
                pathMaterial: "dirt",
                pathType: 'footway',
                width: parseMeters(properties.width?.toString()) ?? 2
            }
            return prop
        } else if (properties.type == "fence") {
            const fenceParams = getFenceMaterialFromOSMType(properties.fence_type);
            const minHeight = parseHeight(properties.min_height?.toString(), 0);
            const height = parseHeight(properties.height?.toString(), fenceParams.defaultHeight) - minHeight;
            if (height <= 0) {
                return undefined
            }
            const prop: VectorPolylineDescriptor = {
                osm_id: properties.osm_id,
                type: 'fence',
                fenceMaterial: fenceParams.material,
                height: height,
                minHeight: minHeight,
            }
            return prop
        } else if (properties.type == "wall") {

            if (properties.wall_type == "hedge") {
                const prop: VectorPolylineDescriptor = {
                    osm_id: properties.osm_id,
                    type: 'wall',
                    wallType: "hedge",
                    height: parseHeight(properties.height?.toString(), 1)
                }
                return prop
            }
            const lookup: Record<string, [VectorPolylineDescriptor['wallType'], number]> = {
                dry_stone: ['stone', 3],
                stone: ['stone', 3],
                brick: ['stone', 3],
                concrete: ['concrete', 3],
                concrete_block: ['concrete', 3],
            };
            const wallTagValue = properties.wall_type;
            const entry = lookup[wallTagValue] ?? lookup.concrete;

            const material = entry[0];
            const height = parseHeight(properties.height?.toString(), entry[1]);
            const prop: VectorPolylineDescriptor = {
                osm_id: properties.osm_id,
                type: 'wall',
                wallType: material,
                height: height
            }
            return prop
        }

    }


    for (let index = 0; index < olFeatures.length; index++) {
        const feature = olFeatures[index];
        const properties = feature.properties

        const descriptor = computeLineStringProperties(properties)
        // if (properties.osm_id == 97855859) {
        //     console.log(feature, "computeLineStringProperties", 97855859)
        // }
        if (descriptor == undefined) {
            continue
        }

        let coordinates: Array<[number, number, number]> = [];
        const geometry = feature.geometry
        if (geometry instanceof LinesStringWithZ) {
            coordinates = geometry.coordinatesWithZ
        } else if (geometry instanceof MultiLineStringWithZ) {
            coordinates = geometry.coordinatesWithZ.reduce((acc, val) => acc.concat(val), [])
        }
        const nodes: VectorNode[] = []
        for (let j = 0; j < coordinates.length; j++) {
            const coordinate = coordinates[j];
            nodes.push({
                type: 'node',
                osmReference: null,
                descriptor: null,
                x: coordinate[0] - worldBuildingPosition[0],
                y: coordinate[1] - worldBuildingPosition[1],
                z: coordinate[2],
                rotation: 0,
            })
        }
        lines.push(
            {
                type: 'polyline',
                osmReference: feature.properties.osm_id,
                descriptor: descriptor,
                nodes: nodes
            }
        )
    }


    return lines

}





function getWallParams(
    type: SurfaceVectorLineDescriptor['wall_type']
): {
    textureId: number;
    uvScaleX: number;
    uvScaleY: number;
} {
    const textureTable: Record<SurfaceVectorLineDescriptor['wall_type'], {
        textureId: number;
        scaleX: number;
        scaleY: number;
    }> = {
        stone: { textureId: ProjectedTextures.StoneWall, scaleX: 4, scaleY: 4 },
        concrete: { textureId: ProjectedTextures.ConcreteWall, scaleX: 4.5, scaleY: 3 },
        hedge: { textureId: ProjectedTextures.Hedge, scaleX: 3, scaleY: 3 },
    };

    const entry = textureTable[type];

    return {
        textureId: entry.textureId,
        uvScaleX: entry.scaleX,
        uvScaleY: entry.scaleY
    };
}


function getFenceParams(
    fenceType: SurfaceVectorLineDescriptor["fence_type"],
    height: number
): {
    textureId: number;
    width: number;
} {
    const textureTable: Record<SurfaceVectorLineDescriptor["fence_type"], {
        textureId: number;
        widthRatio: number;
    }> = {
        wood: { textureId: ProjectedTextures.WoodFence, widthRatio: 1 },
        concrete: { textureId: ProjectedTextures.ConcreteFence, widthRatio: 2 },
        chainLink: { textureId: ProjectedTextures.ChainLinkFence, widthRatio: 1 },
        metal: { textureId: ProjectedTextures.MetalFence, widthRatio: 1.64 }
    };

    const entry = textureTable[fenceType];

    return {
        textureId: entry.textureId,
        width: height * entry.widthRatio
    };
}



class LineSurfaceBuilder {

    multipolygon: Tile3DMultipolygon
    tilePosition: [number, number, number]

    feature: VectorPolyline
    vertices: Vec3[]

    private graphRoad: Road = null;
    segment: number
    tileSize: number

    constructor(
        segment: number,
        tileSize: number,
        feature: VectorPolyline,
    ) {
        this.segment = segment
        this.tileSize = tileSize
        this.feature = feature
        this.vertices = this.feature.nodes.map(node => new Vec3(node.x, node.y, node.z));
    }

    public setRoadGraph(graph: RoadGraph): void {
        if (this.feature.descriptor.type === 'path') {
            let type = -1;

            switch (this.feature.descriptor.pathType) {
                case 'roadway':
                    type = 0;
                    break;
                case 'footway':
                    type = 1;
                    break;
                case 'cycleway':
                    type = 2;
                    break;
                case 'railway':
                    type = 3;
                    break;
                case 'tramway':
                    type = 4;
                    break;
            }

            if (type !== -1) {
                this.graphRoad = graph.addRoad(this.vertices.map(vertex => new Vec2(vertex.x, vertex.y)), this.feature.descriptor.width * mercatorScale, type);
            }
        }
    }

    public getGraphRoad(): Road {
        return this.graphRoad;
    }

    public getIntersectionMaterial(): VectorAreaDescriptor['intersectionMaterial'] {
        if (this.feature.descriptor.pathMaterial === 'concrete') {
            return 'concrete';
        }

        if (this.feature.descriptor.pathMaterial === 'asphalt') {
            return 'asphalt';
        }

        if (this.feature.descriptor.pathMaterial === 'cobblestone') {
            return 'cobblestone';
        }

        return null;
    }

    public getFeatures(): (Tile3DProjectedGeometry | Tile3DHuggingGeometry)[] {
        // if (this.feature.descriptor.osm_id == 97855859) {
        //     console.log(this.feature, 97855859)
        // }
        switch (this.feature.descriptor.type) {
            case 'path': {
                return this.handlePath();
            }
            case 'fence': {
                return [this.handleFence()];
            }
            case 'wall': {
                return [this.handleWall()];
            }
            // case 'waterway': {
            // 	return [this.handleWaterway()];
            // }
        }

        return [];
    }

    private handleFence(): Tile3DHuggingGeometry {
        const builder = new Tile3DProjectedGeometryBuilder(this.segment, this.tileSize);
        builder.setZIndex(ZIndexMap.Fence)
        builder.addRing(Tile3DRingType.Outer, this.feature.nodes.map(node => new Vec3(node.x, node.y, node.z)));

        const { width, textureId } = getFenceParams(
            this.feature.descriptor.fenceMaterial,
            this.feature.descriptor.height
        );

        builder.addFence({
            minHeight: (this.feature.descriptor.minHeight ?? 0) * mercatorScale,
            height: this.feature.descriptor.height * mercatorScale,
            width: width,
            textureId: textureId
        });

        const result = builder.getGeometry();

        return { ...result, type: 'hugging' };
    }

    private handleWall(): Tile3DHuggingGeometry {
        const builder = new Tile3DProjectedGeometryBuilder(this.segment, this.tileSize);

        builder.setZIndex(ZIndexMap.Wall)
        builder.addRing(Tile3DRingType.Outer, this.feature.nodes.map(node => new Vec3(node.x, node.y, node.z)));

        const params = getWallParams(this.feature.descriptor.wallType);

        builder.addExtrudedPath({
            width: 0.8 * mercatorScale,
            height: this.feature.descriptor.height * mercatorScale,
            textureId: params.textureId,
            textureScaleX: params.uvScaleX,
            textureScaleY: params.uvScaleY
        });

        const result = builder.getGeometry();

        return { ...result, type: 'hugging' };
    }

    private handlePath(): Tile3DProjectedGeometry[] {
        const features: Tile3DProjectedGeometry[] = [];
        const side = this.getRoadSideFromDescriptor(this.feature.descriptor.side);
        const params = this.getPathParams(
            this.feature.descriptor.pathType,
            this.feature.descriptor.pathMaterial,
            this.feature.descriptor.isRoadwayMarked,
            this.feature.descriptor.lanesForward,
            this.feature.descriptor.lanesBackward,
            this.feature.descriptor.width,
            mercatorScale
        );
        const { vertices, vertexAdjacentToStart, vertexAdjacentToEnd } = this.getPathBuilderVertices();

        if (vertices.length < 2) {
            return features;
        }



        for (const path of params) {
            const builder = new Tile3DProjectedGeometryBuilder(this.segment, this.tileSize);
            builder.setZIndex(path.zIndex);
            builder.addRing(Tile3DRingType.Outer, vertices);

            builder.addPath({
                width: this.feature.descriptor.width * mercatorScale * path.widthScale,
                uvMinX: path.uvMinX,
                uvMaxX: path.uvMaxX,
                textureId: path.textureId,
                uvFollowRoad: path.uvFollowRoad,
                uvScale: path.uvScale,
                uvScaleY: path.uvScaleY,
                side,
                vertexAdjacentToStart,
                vertexAdjacentToEnd,
                height: 0
            });

            features.push(builder.getGeometry());


            // if (path.needsUsageMask) {
            //     features.push(builder.getTerrainMaskGeometry());
            // }
        }

        return features;
    }

    getRoadSideFromDescriptor(descriptorValue: VectorPolylineDescriptor['side']): RoadSide {
        if (descriptorValue === 'left') {
            return RoadSide.Left;
        }

        if (descriptorValue === 'right') {
            return RoadSide.Right;
        }

        return RoadSide.Both;
    }

    getPathParams(
        pathType: VectorPolylineDescriptor['pathType'],
        pathMaterial: VectorPolylineDescriptor['pathMaterial'],
        isRoadwayMarked: boolean,
        lanesForward: number,
        lanesBackward: number,
        width: number,
        mercatorScale: number
    ): {
        textureId: number;
        widthScale: number;
        uvScale: number;
        uvScaleY: number;
        uvMinX: number;
        uvMaxX: number;
        uvFollowRoad: boolean;
        zIndex: number;
        needsUsageMask: boolean;
    }[] {
        const params = [{
            textureId: 0,
            widthScale: 1,
            uvScale: 1,
            uvScaleY: 1,
            uvMinX: 0,
            uvMaxX: 1,
            zIndex: 0,
            uvFollowRoad: false,
            needsUsageMask: false
        }];

        switch (pathType) {
            case 'footway': {
                switch (pathMaterial) {
                    case 'wood': {
                        params[0].textureId = ProjectedTextures.WoodRoad;
                        params[0].zIndex = ZIndexMap.WoodFootway;
                        params[0].uvFollowRoad = true;
                        params[0].uvScaleY = 4;
                        params[0].uvMaxX = width / 4;
                        break;
                    }
                    case 'asphalt': {
                        params[0].textureId = ProjectedTextures.Asphalt;
                        params[0].zIndex = ZIndexMap.AsphaltFootway;
                        params[0].uvScale = 20;
                        break;
                    }
                    default: {
                        params[0].textureId = ProjectedTextures.Pavement;
                        params[0].zIndex = ZIndexMap.Footway;
                        params[0].uvScale = 10;
                    }
                }
                break;
            }
            // case 'roadway': {
            // 	const uvXParams = getRoadUV(lanesForward, lanesBackward);
            // 	params[0].uvMinX = uvXParams.minX;
            // 	params[0].uvMaxX = uvXParams.maxX;
            // 	params[0].uvFollowRoad = true;

            // 	switch (pathMaterial) {
            // 		case 'asphalt': {
            // 			params[0].textureId = isRoadwayMarked ? ProjectedTextures.AsphaltRoad : ProjectedTextures.AsphaltUnmarkedRoad;
            // 			params[0].zIndex = ZIndexMap.AsphaltRoadway;
            // 			params[0].uvScaleY = 12;
            // 			params[0].needsUsageMask = true;
            // 			break;
            // 		}
            // 		case 'concrete': {
            // 			params[0].textureId = isRoadwayMarked ? ProjectedTextures.ConcreteRoad : ProjectedTextures.ConcreteUnmarkedRoad;
            // 			params[0].zIndex = ZIndexMap.ConcreteRoadway;
            // 			params[0].uvScaleY = 12;
            // 			params[0].needsUsageMask = true;
            // 			break;
            // 		}
            // 		case 'wood': {
            // 			params[0].textureId = ProjectedTextures.WoodRoad;
            // 			params[0].zIndex = ZIndexMap.WoodRoadway;
            // 			params[0].uvScaleY = 4;
            // 			params[0].uvMinX = 0;
            // 			params[0].uvMaxX = width * mercatorScale / 4;
            // 			params[0].needsUsageMask = true;
            // 			break;
            // 		}
            // 		case 'cobblestone': {
            // 			params[0].textureId = ProjectedTextures.Cobblestone;
            // 			params[0].zIndex = ZIndexMap.CobblestoneRoadway;
            // 			params[0].uvMinX = 0;
            // 			params[0].uvMaxX = width * mercatorScale / 6;
            // 			params[0].uvScaleY = 6;
            // 			params[0].needsUsageMask = true;
            // 			break;
            // 		}
            // 		case 'dirt': {
            // 			params[0].uvFollowRoad = true;
            // 			params[0].textureId = ProjectedTextures.DirtRoad;
            // 			params[0].zIndex = ZIndexMap.DirtRoadway;
            // 			params[0].widthScale = 1.7;
            // 			params[0].uvMinX = 0;
            // 			params[0].uvMaxX = 1;
            // 			params[0].uvScaleY = width * mercatorScale;
            // 			break;
            // 		}
            // 		case 'sand': {
            // 			params[0].uvFollowRoad = true;
            // 			params[0].textureId = ProjectedTextures.SandRoad;
            // 			params[0].zIndex = ZIndexMap.SandRoadway;
            // 			params[0].widthScale = 1.7;
            // 			params[0].uvMinX = 0;
            // 			params[0].uvMaxX = 1;
            // 			params[0].uvScaleY = width * mercatorScale;
            // 			break;
            // 		}
            // 	}
            // 	break;
            // }
            case 'cycleway': {
                params[0].textureId = ProjectedTextures.Cycleway;
                params[0].zIndex = ZIndexMap.Cycleway;
                params[0].uvFollowRoad = false;
                params[0].uvScale = 8;
                break;
            }
            case 'tramway': {
                params[0].textureId = ProjectedTextures.Rail;
                params[0].zIndex = ZIndexMap.Rail;
                params[0].widthScale = 2;
                params[0].uvFollowRoad = true;
                params[0].uvMinX = 0;
                params[0].uvMaxX = 1;
                params[0].uvScaleY = width * mercatorScale * 4;
                break;
            }
            case 'railway': {
                params[0].textureId = ProjectedTextures.Railway;
                params[0].zIndex = ZIndexMap.Railway;
                params[0].widthScale = 2;
                params[0].uvFollowRoad = true;
                params[0].uvMinX = 0;
                params[0].uvMaxX = 1;
                params[0].uvScaleY = width * mercatorScale * 4;

                params.push({
                    textureId: ProjectedTextures.RailwayTop,
                    zIndex: ZIndexMap.RailwayOverlay,
                    widthScale: 2,
                    uvFollowRoad: true,
                    uvMinX: 0,
                    uvMaxX: 1,
                    uvScaleY: width * mercatorScale * 4,
                    uvScale: 1,
                    needsUsageMask: false
                });
                params.push({
                    textureId: ProjectedTextures.Rail,
                    zIndex: ZIndexMap.Rail,
                    widthScale: 2,
                    uvFollowRoad: true,
                    uvMinX: 0,
                    uvMaxX: 1,
                    uvScaleY: width * mercatorScale * 4,
                    uvScale: 1,
                    needsUsageMask: false
                });
                break;
            }
            case 'runway': {
                params[0].uvFollowRoad = false;
                params[0].textureId = ProjectedTextures.Asphalt;
                params[0].zIndex = ZIndexMap.Runway;
                params[0].uvScale = 10;
                break;
            }
        }

        return params;
    }


    private getPathBuilderVertices(): {
        vertices: Vec3[];
        vertexAdjacentToStart: Vec2;
        vertexAdjacentToEnd: Vec2;
    } {
        const vertices: Vec3[] = [...this.vertices];
        const pointStart = vertices[0];
        const pointEnd = vertices[vertices.length - 1];

        let vertexAdjacentToStart: Vec2 = null;
        let vertexAdjacentToEnd: Vec2 = null;

        if (!pointStart.equals(pointEnd) && this.graphRoad) {
            const intersectionStart = this.graphRoad.start.getIntersection();
            const intersectionEnd = this.graphRoad.end.getIntersection();

            if (intersectionStart && vertices.length > 1) {
                vertexAdjacentToStart = this.processPathEnd(vertices, intersectionStart, 'first');
            }
            if (intersectionEnd && vertices.length > 1) {
                vertexAdjacentToEnd = this.processPathEnd(vertices, intersectionEnd, 'last');
            }
        }

        return {
            vertices,
            vertexAdjacentToStart,
            vertexAdjacentToEnd
        };
    }

    private processPathEnd(vertices: Vec3[], intersection: Intersection, type: 'first' | 'last'): Vec2 {
        let adjacentVertex: Vec2 = null;

        if (intersection.directions.length === 2) {
            for (const { road, vertex } of intersection.directions) {
                const prevVertexIndex = type === 'first' ? 1 : vertices.length - 2;

                if (
                    road !== this.graphRoad &&
                    !vertex.vector.equals(vertices[prevVertexIndex].xy)
                ) {
                    adjacentVertex = vertex.vector;
                }
            }
        } else if (intersection.directions.length > 2 && !intersection.userData.skip) {
            const dir = intersection.directions.find((dir: IntersectionDirection) => dir.road === this.graphRoad);

            if (dir && dir.trimmedEnd && vertices.length > 1) {
                const prevVertexIndex = type === 'first' ? 1 : vertices.length - 2;

                if (dir.trimmedEnd.equals(vertices[prevVertexIndex].xy)) {
                    if (type === 'first') {
                        adjacentVertex = vertices[0].xy;
                        vertices.shift();
                    } else {
                        adjacentVertex = vertices[vertices.length - 1].xy;
                        vertices.pop();
                    }
                } else {
                    const vertexIndex = type === 'first' ? 0 : vertices.length - 1;

                    vertices[vertexIndex].set(dir.trimmedEnd.x, dir.trimmedEnd.y, vertices[vertexIndex].z);
                }
            }
        }

        return adjacentVertex;
    }
}