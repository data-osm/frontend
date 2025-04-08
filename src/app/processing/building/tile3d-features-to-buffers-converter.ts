import { Box3, TypedArray, Vector3 } from "three";

const getRandom = <T>(arr: T[], n: number): T[] => {
    let result = new Array<T>(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        const x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

export enum InstanceStructure {
    Generic,
    Tree,
    Advanced
}

const temp_vec3 = new Vector3()

export const InstanceStructureSchemas: Record<InstanceStructure, any> = {
    [InstanceStructure.Generic]: {
        componentsPerInstance: 5,
        getComponents(instance: any): number[] {
            return [instance.x, instance.y, instance.z, instance.scale, instance.rotation];
        },
        transformBoundingBox(boundingBox: Box3, components: number[]): Box3 {
            const [x, y, z, scale, rotation] = components;

            return boundingBox
                .expandByScalar(scale)
                .translate(temp_vec3.set(x, y, z));
            // .ro(rotation)
        }
    },
    [InstanceStructure.Tree]: {
        componentsPerInstance: 6,
        getComponents(instance: any): number[] {
            return [instance.x, instance.y, instance.z, instance.scale, instance.rotation, instance.textureId];
        },
        transformBoundingBox(boundingBox: Box3, components: number[]): Box3 {
            const [x, y, z, scale, rotation] = components;
            return boundingBox
                .expandByScalar(scale)
                .translate(temp_vec3.set(x, y, z));
            // .rotate2D(rotation)
        }
    },
    [InstanceStructure.Advanced]: {
        componentsPerInstance: 9,
        getComponents(instance: any): number[] {
            return [
                instance.x, instance.y, instance.z,
                instance.scaleX, instance.scaleY, instance.scaleZ,
                instance.rotationX, instance.rotationY, instance.rotationZ
            ];
        },
        transformBoundingBox(boundingBox: Box3, components: number[]): Box3 {
            const [
                x, y, z,
                scaleX, scaleY, scaleZ,
                rotationX, rotationY, rotationZ
            ] = components;

            return boundingBox
                .expandByPoint(temp_vec3.set(scaleX, scaleY, scaleZ))
                .translate(temp_vec3.set(x, y, z))
            // .rotateEuler(rotationX, rotationY, rotationZ)
        }
    }
};

export const Tile3DInstanceLODConfig: Record<any, any> = {
    tree: {
        structure: InstanceStructure.Tree,
        LOD0MaxDistance: 2000,
        LOD1MaxDistance: 5000,
        LOD1Fraction: 0.5
    },
    shrubbery: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1200,
        LOD1MaxDistance: 2500,
        LOD1Fraction: 0.5,
    },
    adColumn: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    transmissionTower: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 3000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    utilityPole: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 3000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    wire: {
        structure: InstanceStructure.Advanced,
        LOD0MaxDistance: 3000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    hydrant: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    trackedCrane: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 2000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    towerCrane: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 3000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    bench: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    picnicTable: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    busStop: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    windTurbine: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 5000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    memorial: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 2000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    statueSmall: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    statueBig: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    sculpture: {
        structure: InstanceStructure.Generic,
        LOD0MaxDistance: 1000,
        LOD1MaxDistance: 0,
        LOD1Fraction: 0,
    },
    // power lines, etc.
};

export default class Utils {
    public static hexToRgb(hex: string): number[] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }

    public static fillTypedArraySequence<T extends TypedArray>(typedArray: T, sequence: T): T {
        const length = typedArray.length;
        let sequenceLength = sequence.length;
        let position = sequenceLength;

        if (length > 0) {
            typedArray.set(sequence);

            while (position < length) {
                if (position + sequenceLength > length) {
                    sequenceLength = length - position;
                }

                typedArray.copyWithin(position, 0, sequenceLength);
                position += sequenceLength;
                sequenceLength <<= 1;
            }
        }

        return typedArray;
    }

    public static mergeTypedArrays<T extends TypedArray>(type: { new(l: number): T }, typedArrays: T[]): T {
        if (typedArrays.length > 0) {
            let length = 0;

            for (let i = 0; i < typedArrays.length; i++) {
                length += typedArrays[i].length;
            }

            const array = new type(length);

            let currentLength = 0;

            for (let i = 0; i < typedArrays.length; i++) {
                array.set(typedArrays[i], currentLength);
                currentLength += typedArrays[i].length;
            }

            return array;
        }

        return new type(0);
    }

    // public static isMobileBrowser(): boolean {
    //     let check = false;
    //     (function (a): void {
    //         if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    //     })(navigator.userAgent || navigator.vendor);
    //     return check;
    // }

    public static resolveEndpointTemplate(
        {
            values,
            template
        }: {
            values: Record<string, number | string>;
            template: string;
        }
    ): string {
        let result: string = template;

        for (const [key, value] of Object.entries(values)) {
            result = result.replace(`{${key}}`, value.toString())
        }

        return result;
    }
}

export class Tile3DFeaturesToBuffersConverter {
    public static convert(collection) {
        return {
            extruded: this.getExtrudedBuffers(collection.extruded),
            projected: this.getProjectedBuffers(collection.projected),
            hugging: this.getHuggingBuffers(collection.hugging),
            terrainMask: this.getTerrainMaskBuffers(collection.terrainMask, collection.zoom),
            labels: this.getLabelsBuffers(collection.labels),
            instances: this.getInstanceBuffers(collection.instances)
        };
    }

    // If multiple extruded geometries (buildings) have the same OSM ref, merge them into one geometry.
    // This is required for the ownership system to work properly. Unless we do this, multipolygons with multiple
    // outlines are not going to be treated as single buildings when doing GPU picking or hiding/showing buildings using
    // the ownership system.
    private static mergeExtrudedGeometriesWithSameOsmRef(features: any[]): void {
        const featureMap = new Map<number, any[]>();

        for (const feature of features) {
            const key = feature.idBuffer[0];

            if (!featureMap.has(key)) {
                featureMap.set(key, []);
            }

            featureMap.get(key).push(feature);
        }

        const featuresToRemove: any[] = [];

        for (const feature of features) {
            const key = feature.idBuffer[0];
            const featuresWithSameId = featureMap.get(key);

            if (!featuresWithSameId.includes(feature)) {
                continue;
            }

            const featuresToMerge = featuresWithSameId
                .filter(f => f !== feature)
                .filter(f => f.idBuffer[1] === feature.idBuffer[1])

            if (featuresToMerge.length === 0) {
                continue;
            }

            for (const other of featuresToMerge) {
                this.mergeExtrudedGeometries(feature, other);

                featuresWithSameId.splice(featuresWithSameId.indexOf(other), 1);
                featuresToRemove.push(other);
            }
        }

        for (const feature of featuresToRemove) {
            features.splice(features.indexOf(feature), 1);
        }
    }

    private static mergeExtrudedGeometries(geom0: any, geom1: any): void {
        geom0.boundingBox.includeAABB(geom1.boundingBox);
        geom0.positionBuffer = Utils.mergeTypedArrays(Float32Array, [geom0.positionBuffer, geom1.positionBuffer]);
        geom0.uvBuffer = Utils.mergeTypedArrays(Float32Array, [geom0.uvBuffer, geom1.uvBuffer]);
        geom0.normalBuffer = Utils.mergeTypedArrays(Float32Array, [geom0.normalBuffer, geom1.normalBuffer]);
        geom0.textureIdBuffer = Utils.mergeTypedArrays(Uint8Array, [geom0.textureIdBuffer, geom1.textureIdBuffer]);
        geom0.colorBuffer = Utils.mergeTypedArrays(Uint8Array, [geom0.colorBuffer, geom1.colorBuffer]);
    }

    private static getExtrudedBuffers(features: any[]) {
        this.mergeExtrudedGeometriesWithSameOsmRef(features);

        const positionBuffers: Float32Array[] = [];
        const uvBuffers: Float32Array[] = [];
        const normalBuffers: Float32Array[] = [];
        const textureIdBuffers: Uint8Array[] = [];
        const colorBuffers: Uint8Array[] = [];

        for (const feature of features) {
            positionBuffers.push(feature.positionBuffer);
            uvBuffers.push(feature.uvBuffer);
            normalBuffers.push(feature.normalBuffer);
            textureIdBuffers.push(feature.textureIdBuffer);
            colorBuffers.push(feature.colorBuffer);
        }

        const positionBufferMerged = Utils.mergeTypedArrays(Float32Array, positionBuffers);
        const uvBufferMerged = Utils.mergeTypedArrays(Float32Array, uvBuffers);
        const normalBufferMerged = Utils.mergeTypedArrays(Float32Array, normalBuffers);
        const textureIdBufferMerged = Utils.mergeTypedArrays(Uint8Array, textureIdBuffers);
        const colorBufferMerged = Utils.mergeTypedArrays(Uint8Array, colorBuffers);

        const offsetBuffer = new Uint32Array(features.length);
        const idBuffer = new Uint32Array(features.length * 2);
        const localIdBuffers: Uint32Array[] = [];
        let totalVertexCount: number = 0;

        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            const vertexCount = feature.positionBuffer.length / 3;

            idBuffer[i * 2] = feature.idBuffer[0];
            idBuffer[i * 2 + 1] = feature.idBuffer[1];
            offsetBuffer[i] = totalVertexCount;

            totalVertexCount += vertexCount;

            localIdBuffers.push(Utils.fillTypedArraySequence(new Uint32Array(vertexCount), new Uint32Array([i])));
        }

        const localIdBuffer = Utils.mergeTypedArrays(Uint32Array, localIdBuffers);

        return {
            positionBuffer: positionBufferMerged,
            uvBuffer: uvBufferMerged,
            normalBuffer: normalBufferMerged,
            textureIdBuffer: textureIdBufferMerged,
            colorBuffer: colorBufferMerged,
            idBuffer: idBuffer,
            offsetBuffer: offsetBuffer,
            localIdBuffer: localIdBuffer,
            boundingBox: this.boundingBoxToFlatObject(this.joinBoundingBoxes(features))
        };
    }

    private static getProjectedBuffers(features: any[]) {
        const sortedFeatures = this.sortProjectedFeatures(features);

        const boundingBox = this.joinBoundingBoxes(sortedFeatures);
        boundingBox.min.y = -1000;
        boundingBox.max.y = 100000;

        const positionBuffers: Float32Array[] = [];
        const uvBuffers: Float32Array[] = [];
        const normalBuffers: Float32Array[] = [];
        const textureIdBuffers: Uint8Array[] = [];

        for (const feature of sortedFeatures) {
            positionBuffers.push(feature.positionBuffer);
            uvBuffers.push(feature.uvBuffer);
            normalBuffers.push(feature.normalBuffer);
            textureIdBuffers.push(feature.textureIdBuffer);
        }

        const positionBufferMerged = Utils.mergeTypedArrays(Float32Array, positionBuffers);
        const uvBufferMerged = Utils.mergeTypedArrays(Float32Array, uvBuffers);
        const normalBufferMerged = Utils.mergeTypedArrays(Float32Array, normalBuffers);
        const textureIdBufferMerged = Utils.mergeTypedArrays(Uint8Array, textureIdBuffers);

        return {
            positionBuffer: positionBufferMerged,
            normalBuffer: normalBufferMerged,
            uvBuffer: uvBufferMerged,
            textureIdBuffer: textureIdBufferMerged,
            boundingBox: this.boundingBoxToFlatObject(boundingBox)
        };
    }

    private static getHuggingBuffers(features: any[]) {
        const boundingBox = this.joinBoundingBoxes(features);
        boundingBox.min.y = -1000;
        boundingBox.max.y = 100000;

        const positionBuffers: Float32Array[] = [];
        const uvBuffers: Float32Array[] = [];
        const normalBuffers: Float32Array[] = [];
        const textureIdBuffers: Uint8Array[] = [];

        for (const feature of features) {
            positionBuffers.push(feature.positionBuffer);
            uvBuffers.push(feature.uvBuffer);
            normalBuffers.push(feature.normalBuffer);
            textureIdBuffers.push(feature.textureIdBuffer);
        }

        const positionBufferMerged = Utils.mergeTypedArrays(Float32Array, positionBuffers);
        const uvBufferMerged = Utils.mergeTypedArrays(Float32Array, uvBuffers);
        const normalBufferMerged = Utils.mergeTypedArrays(Float32Array, normalBuffers);
        const textureIdBufferMerged = Utils.mergeTypedArrays(Uint8Array, textureIdBuffers);

        return {
            positionBuffer: positionBufferMerged,
            normalBuffer: normalBufferMerged,
            uvBuffer: uvBufferMerged,
            textureIdBuffer: textureIdBufferMerged,
            boundingBox: this.boundingBoxToFlatObject(boundingBox)
        };
    }

    private static getTerrainMaskBuffers(features: any[], zoom: number) {
        const tileSize = 40075016.68 / (1 << zoom);
        const positionBuffers: Float32Array[] = [];

        for (const feature of features) {
            positionBuffers.push(feature.positionBuffer);
        }

        const positionBufferMerged = Utils.mergeTypedArrays(Float32Array, positionBuffers);

        for (let i = 0; i < positionBufferMerged.length; i += 1) {
            positionBufferMerged[i] /= tileSize;
        }

        return { positionBuffer: positionBufferMerged };
    }

    private static getLabelsBuffers(features: any[]) {
        const positionArray: number[] = [];
        const priorityArray: number[] = [];
        const textArray: string[] = [];
        const boundingBox = new Box3();

        for (const feature of features) {
            const position = new Vector3(feature.position[0], feature.position[1], feature.position[2]);

            positionArray.push(position.x, position.y, position.z);
            priorityArray.push(feature.priority);
            textArray.push(feature.text);
            boundingBox.expandByPoint(position);
        }

        return {
            position: new Float32Array(positionArray),
            priority: new Float32Array(priorityArray),
            text: textArray,
            boundingBox: this.boundingBoxToFlatObject(boundingBox)
        };
    }

    private static getInstanceBuffers(features: any[]): Record<string, any> {
        const collections: Map<any, any[]> = new Map();

        for (const feature of features) {
            if (!collections.has(feature.instanceType)) {
                collections.set(feature.instanceType, []);
            }

            collections.get(feature.instanceType).push(feature);
        }

        const buffers: Record<string, any> = {};

        for (const [name, collection] of collections.entries()) {
            const lodConfig = Tile3DInstanceLODConfig[name];
            const lods = Tile3DFeaturesToBuffersConverter.getInstancesBuffers(collection, lodConfig);

            buffers[name] = {
                interleavedBufferLOD0: lods[0],
                interleavedBufferLOD1: lods[1]
            };
        }

        return buffers;
    }

    private static getInstancesBuffers(instances: any[], config: any): [Float32Array, Float32Array] {
        const halfInstances = config.LOD1Fraction > 0 ?
            this.clearInstancesWithHeatMap(instances, 12, config.LOD1Fraction) : [];

        return [
            this.createInstanceInterleavedBuffer(instances, config),
            this.createInstanceInterleavedBuffer(halfInstances, config)
        ];
    }

    private static clearInstancesWithHeatMap(
        instances: any[],
        resolution: number,
        factor: number
    ): any[] {
        const TileSize = 611.4962158203125;
        const heatMap: any[][] = new Array(resolution ** 2).fill(null).map(() => []);

        for (const instance of instances) {
            const x = instance.x / TileSize * resolution;
            const y = instance.z / TileSize * resolution;
            const index = Math.floor(x) + Math.floor(y) * resolution;

            heatMap[index].push(instance);
        }

        const cleared: any[] = [];

        for (const cell of heatMap) {
            if (cell.length === 0) {
                continue;
            }

            const newCount = Math.max(Math.round(cell.length * factor), 1);
            cleared.push(...getRandom(cell, newCount));
        }

        return cleared;
    }

    private static createInstanceInterleavedBuffer(instances: any[], config: any): Float32Array {
        const schema = InstanceStructureSchemas[config.structure];
        const buffer = new Float32Array(instances.length * schema.componentsPerInstance);

        for (let i = 0; i < instances.length; i++) {
            const feature = instances[i];
            const components = schema.getComponents(feature);

            for (let j = 0; j < schema.componentsPerInstance; j++) {
                buffer[i * schema.componentsPerInstance + j] = components[j];
            }
        }

        return buffer;
    }

    private static joinBoundingBoxes(features: { boundingBox: Box3 }[]): Box3 {
        const joined = new Box3()

        for (const feature of features) {
            joined.union(feature.boundingBox)
            // joined.includeAABB(feature.boundingBox);
        }

        return joined;
    }

    private static sortProjectedFeatures(features: any[]): any[] {
        return features.sort((a, b) => {
            return a.zIndex - b.zIndex;
        });
    }

    private static boundingBoxToFlatObject(box: Box3) {
        return {
            minX: box.min.x,
            minY: box.min.y,
            minZ: box.min.z,
            maxX: box.max.x,
            maxY: box.max.y,
            maxZ: box.max.z
        };
    }
}