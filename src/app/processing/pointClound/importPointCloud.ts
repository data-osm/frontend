import ColorMap from '@giro3d/giro3d/core/ColorMap';
import PointCloud from '@giro3d/giro3d/entities/PointCloud';
import COPCSource from '@giro3d/giro3d/sources/COPCSource.js';
import { PointCloudAttribute } from '@giro3d/giro3d/sources/PointCloudSource';
import type { Getter } from 'copc';
import { makeColorRamp } from './colormap';

function createFileGetter(file: File): (begin: number, end: number) => Promise<Uint8Array> {
    return async (begin: number, end: number): Promise<Uint8Array> => {
        const blob = file.slice(begin, end);
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    };
}

export default class ImportPointCloud {
    constructor() {

    }

    load(pointCloud: File) {
        const source = new COPCSource({
            url: createFileGetter(pointCloud)
        });
        return source.initialize()
    }

    activeAttribute(pointCloud: PointCloud, attribute: PointCloudAttribute) {
        pointCloud.colorMap = new ColorMap({ colors: [], min: attribute.min, max: attribute.max });
        pointCloud.setColoringMode('attribute');
        pointCloud.setActiveAttribute(attribute.name);
        pointCloud.colorMap.colors = makeColorRamp("bathymetry");
    }

    listAttributeName(attributes: PointCloudAttribute[]) {
        return attributes.map((attribute: PointCloudAttribute) => {
            return attribute.name
        })
    }
}