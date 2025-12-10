import { MathUtils } from "three/src/math/MathUtils";
import { SourcePointFeature, VectorNode, VectorNodeDescriptor } from "../building/type";
import { Tile3DFeature, Tile3DInstance, Tile3DInstanceType } from "../polygon/tile3d-projected-geometry-builder";
import { getTreeHeightRangeFromTextureId, getTreeTextureIdFromType, getTreeTextureScaling, getTreeType } from "./type";
import Vec2 from "../math/vector2";
import RoadGraph from "../linestring/road-graph/RoadGraph";
import SeededRandom from "../building/building-builder";
import { Tile3DFeaturesToBuffersConverter } from "../building/tile3d-features-to-buffers-converter";
import { Box3 } from "three";
import { ExtrudedPointTile } from "../building-processing-worker/worker-packer";
import { scale } from "ol/size";
import { bool } from "three/src/nodes/TSL";

const mercatorScale: number = 1.52122668;
const tmpBox3 = new Box3()

const InstanceTextureIdList: Record<Tile3DInstanceType, number> = {
    tree: 0,
    adColumn: 1,
    transmissionTower: 2,
    hydrant: 3,
    trackedCrane: 4,
    towerCrane: 5,
    bench: 6,
    picnicTable: 7,
    busStop: 8,
    windTurbine: 9,
    memorial: 10,
    statueSmall: 11,
    shrubbery: 12,
    utilityPole: 13,
    wire: 14,
    statueBig: 15,
    sculpture: 16,
    streetLamp2Lamp: 17,
    streetLampBentMast: 18,
    streetLampPole: 19,
    streetLampStraightMast: 20
};


export function createPointGeometries(renderFeatures: SourcePointFeature[], worldBuildingPosition: [number, number, number], graph: RoadGraph): ExtrudedPointTile {
    const formattedFeatures = formatPointFeatures(renderFeatures, worldBuildingPosition)
    const vectorFeatures = createPointNodeVector(formattedFeatures)
    if (vectorFeatures.length == 0) {
        return undefined
    }

    let instancedGeometries: Tile3DInstance[] = []
    for (let index = 0; index < vectorFeatures.length; index++) {
        const vectorFeature = vectorFeatures[index];
        const pointBuilder = new PointBuilder(vectorFeature)
        pointBuilder.setRoadGraph(graph)
        const geometries = pointBuilder.getFeatures()

        instancedGeometries = instancedGeometries.concat(geometries)
    }

    // if (renderFeatures.map((f) => f.properties.osm_id).indexOf(13175078344) != -1) {
    //     console.log(instancedGeometries)
    // }

    if (instancedGeometries.length == 0) {
        return undefined
    }

    tmpBox3.setFromArray(instancedGeometries.map((f) => [f.x, f.y, f.z]).reduce((acc, val) => acc.concat(val), []))
    const buffer = Tile3DFeaturesToBuffersConverter.getInstanceBuffers(instancedGeometries)

    return {
        worldBuildingPosition,
        "boundingBoxMinMax": [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z],
        data: buffer
    }

}

function formatPointFeatures(renderFeatures: SourcePointFeature[], worldBuildingPosition: [number, number, number]) {
    return renderFeatures.map((feature) => {
        feature.flatCoordinates = [feature.flatCoordinates[0] - worldBuildingPosition[0], feature.flatCoordinates[1] - worldBuildingPosition[1]]
        return feature
    })
}

function createPointNodeVector(renderFeatures: SourcePointFeature[]): VectorNode[] {
    return renderFeatures.map((feature) => {

        let descriptorType: VectorNodeDescriptor['type'] = feature.properties.type
        if (descriptorType == 'streetLampBentMast' && Boolean(feature.properties.light_count) && feature.properties.light_count == 2) {
            descriptorType = 'streetLamp2Lamp'
        }

        let rotation = 0
        if (Boolean(feature.properties.roads_orientation) && ['streetLampBentMast', 'bench', 'picnicTable', 'busStop'].indexOf(descriptorType) != -1) {

            if (Boolean(feature.properties.roads_orientation.angle)) {
                const featureRotation = feature.properties.roads_orientation.angle % (Math.PI * 2);
                if (feature.properties.roads_orientation.side > 0) {
                    rotation = -featureRotation + Math.PI / 2
                } else {
                    rotation = -featureRotation - Math.PI / 2
                }

            }
        }
        // if (feature.properties.osm_id == 5115388663) {
        //     console.log(rotation, feature.properties.roads_orientation)
        // }
        return {
            type: 'node',
            osmReference: feature.properties.osm_id,
            descriptor: {
                type: descriptorType,
                treeType: getTreeType(feature.properties),
                direction: feature.properties.direction,
                minHeight: feature.properties.min_height,
                height: feature.properties.height
            },
            x: feature.flatCoordinates[0],
            y: feature.flatCoordinates[1],
            z: feature.properties.elevation,
            rotation: rotation,
        }
    })
}

class PointBuilder {
    private graph: RoadGraph = null;

    feature: VectorNode
    x: number
    y: number
    z: number

    constructor(feature: VectorNode) {
        this.feature = feature
        this.x = this.feature.x
        this.y = this.feature.y
        this.z = this.feature.z
    }
    public setRoadGraph(graph: RoadGraph): void {
        this.graph = graph;
    }

    public getFeatures(): Tile3DInstance[] {

        switch (this.feature.descriptor.type) {
            case 'tree': {
                return [this.getTreeInstanceFeature({
                    height: this.feature.descriptor.height,
                    minHeight: this.feature.descriptor.minHeight
                })];
            }
            case 'fireHydrant': {
                return [this.getGenericInstanceFeature({
                    type: 'hydrant',
                    minHeight: this.feature.descriptor.minHeight,
                    height: 1.5,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.hydrant
                })];
            }
            case 'bench': {
                return [this.getGenericInstanceFeature({
                    type: 'bench',
                    rotateToNearestPath: true,
                    // rotation: this.feature.descriptor.direction,
                    textureId: InstanceTextureIdList.bench,
                    rotation: this.feature.rotation
                })];
            }
            case 'picnicTable': {
                return [this.getGenericInstanceFeature({
                    type: 'picnicTable',
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.picnicTable,
                    rotation: this.feature.rotation
                })];
            }
            case 'busStop': {
                return [this.getGenericInstanceFeature({
                    type: 'busStop',
                    rotateToNearestPath: false,
                    pathGroupId: 0,
                    textureId: InstanceTextureIdList.busStop,
                    rotation: this.feature.rotation
                })];
            }
            case 'memorial': {
                return [this.getGenericInstanceFeature({
                    type: 'memorial',
                    minHeight: this.feature.descriptor.minHeight,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.memorial
                })];
            }
            case 'statue': {
                const rnd = new SeededRandom(Math.floor(this.x + this.y));
                const type = rnd.generate() > 0.5 ? 'statueSmall' : 'statueBig'

                return [this.getGenericInstanceFeature({
                    type: type,
                    minHeight: this.feature.descriptor.minHeight,
                    rotateToNearestPath: true,
                    textureId: type == 'statueSmall' ? InstanceTextureIdList.statueSmall : InstanceTextureIdList.statueBig
                })];
            }
            case 'sculpture': {

                return [this.getGenericInstanceFeature({
                    type: 'sculpture',
                    minHeight: this.feature.descriptor.minHeight,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.sculpture
                })];
            }
            case 'streetLamp2Lamp': {
                return [this.getGenericInstanceFeature({
                    type: 'streetLamp2Lamp',
                    height: 1.5,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.streetLamp2Lamp,
                    rotation: this.feature.rotation
                })];
            }
            case 'streetLampBentMast': {
                return [this.getGenericInstanceFeature({
                    type: 'streetLampBentMast',
                    height: 1.5,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.streetLampBentMast,
                    rotation: this.feature.rotation
                })];
            }
            case 'streetLampPole': {
                return [this.getGenericInstanceFeature({
                    type: 'streetLampPole',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.streetLampPole,
                    rotation: this.feature.rotation
                })];
            }
            case 'streetLampStraightMast': {
                return [this.getGenericInstanceFeature({
                    type: 'streetLampStraightMast',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: true,
                    textureId: InstanceTextureIdList.streetLampStraightMast,
                    rotation: this.feature.rotation
                })]
            }
            case 'trackedCrane': {
                return [this.getGenericInstanceFeature({
                    type: 'trackedCrane',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.trackedCrane,
                    rotation: this.feature.rotation
                })];
            }
            case 'towerCrane': {
                return [this.getGenericInstanceFeature({
                    type: 'towerCrane',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.towerCrane
                })];
            }
            case 'windTurbine': {
                return [this.getGenericInstanceFeature({
                    type: 'windTurbine',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.windTurbine
                })];
            }
            case 'transmissionTower': {
                return [this.getGenericInstanceFeature({
                    type: 'transmissionTower',
                    minHeight: this.feature.descriptor.minHeight,
                    // height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.transmissionTower
                })];
            }
            case 'adColumn': {
                return [this.getGenericInstanceFeature({
                    type: 'adColumn',
                    minHeight: this.feature.descriptor.minHeight,
                    height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.adColumn
                })];
            }
            case 'utilityPole': {
                return [this.getGenericInstanceFeature({
                    type: 'utilityPole',
                    minHeight: this.feature.descriptor.minHeight,
                    height: 2,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.utilityPole
                })];
            }
            case 'shrubbery': {
                return [this.getGenericInstanceFeature({
                    type: 'shrubbery',
                    minHeight: this.feature.descriptor.minHeight,
                    height: this.feature.descriptor.height,
                    rotateToNearestPath: false,
                    textureId: InstanceTextureIdList.shrubbery
                })];
            }

        }

        return []


    }

    private getGenericInstanceFeature(
        {
            type,
            rotateToNearestPath = false,
            pathGroupId,
            height = 1,
            minHeight,
            rotation,
            textureId
        }: {
            type: Tile3DInstanceType;
            textureId: number,
            rotateToNearestPath?: boolean;
            pathGroupId?: number;
            height?: number;
            minHeight?: number;
            rotation?: number;
        }
    ): Tile3DInstance {
        let rotationAngle: number = 0;
        if (this.feature.osmReference == 5115388663) {
            console.log(rotation, rotation)
        }
        if (rotation !== undefined) {
            // rotationAngle = -MathUtils.degToRad(rotation) + Math.PI * 0.5;
            rotationAngle = rotation;
        }
        // else if (rotateToNearestPath && this.graph) {
        //     const selfPosition = new Vec2(this.x, this.y);
        //     const projection = this.graph.getClosestProjection(selfPosition, pathGroupId);

        //     if (projection) {
        //         rotationAngle = -Vec2.sub(projection, selfPosition).getAngle() + Math.PI * 0.5;
        //     }
        // } 
        else {
            const rnd = new SeededRandom(Math.floor(this.x + this.y));
            rotationAngle = rnd.generate() * Math.PI * 2;
        }

        const verticalOffset = minHeight ?? 0;

        return {
            type: 'instance',
            instanceType: type,
            x: this.x,
            y: this.y,
            z: this.z,
            scale: (height * mercatorScale),
            rotation: rotationAngle,
            textureId: textureId
        };
    }

    private getTreeInstanceFeature(
        {
            height,
            minHeight,
        }: {
            height?: number;
            minHeight?: number;
        }
    ): Tile3DInstance {
        const rnd = new SeededRandom(Math.floor(this.x + this.y));
        const rotationAngle = rnd.generate() * Math.PI * 2;

        const textureIdList = getTreeTextureIdFromType(this.feature.descriptor.treeType);
        const textureId = textureIdList[Math.floor(rnd.generate() * textureIdList.length)];
        const textureScale = getTreeTextureScaling(textureId);

        if (height === undefined) {
            const range = getTreeHeightRangeFromTextureId(textureId);
            height = range[0] + rnd.generate() * (range[1] - range[0]);
        }

        const verticalOffset = minHeight ?? 0;



        return {
            type: 'instance',
            instanceType: 'tree',
            x: this.x,
            y: this.y,
            z: this.z,
            scale: (height * textureScale * mercatorScale),
            rotation: rotationAngle,
            textureId: 0,
            seed: rnd.generate()
        };
    }
}