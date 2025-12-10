import { Fog } from "three";
import { Instance } from "../giro-3d-module";
import { Coordinate, LineString, MultiLineString, MultiPolygon, Polygon } from "../ol-module";

export function mergeFloat32(floatArrays: Array<Float32Array>) {
    const totalLength = floatArrays.map((fa) => fa.length).reduce((partialSum, a) => partialSum + a, 0);
    const result = new Float32Array(totalLength);

    let currentElementInResult = 0
    for (let index = 0; index < floatArrays.length; index++) {
        const element = floatArrays[index];
        result.set(element, currentElementInResult);

        currentElementInResult += element.length
    }

    return result;
}



export class LinesStringWithZ extends LineString {
    protected _coordinatesWithZ: Array<[number, number, number]>

    constructor(coordinates: Coordinate[] | Array<number>, layout, coordinatesWithZ: Array<[number, number, number]>) {
        super(coordinates, layout);
        this._coordinatesWithZ = coordinatesWithZ
    }

    get coordinatesWithZ(): Array<[number, number, number]> {
        return this._coordinatesWithZ
    }

    set coordinatesWithZ(coordinatesWithZ: Array<[number, number, number]>) {
        this._coordinatesWithZ = coordinatesWithZ
    }
}

export class MultiLineStringWithZ extends MultiLineString {
    protected _coordinatesWithZ: Array<Array<[number, number, number]>>

    constructor(coordinates: Array<Coordinate[]> | Array<number>, layout, ends: Array<number>, coordinatesWithZ: Array<Array<[number, number, number]>>) {
        super(coordinates, layout, ends);
        this._coordinatesWithZ = coordinatesWithZ
    }

    get coordinatesWithZ(): Array<Array<[number, number, number]>> {
        return this._coordinatesWithZ
    }
    set coordinatesWithZ(coordinatesWithZ: Array<Array<[number, number, number]>>) {
        this._coordinatesWithZ = coordinatesWithZ
    }
}

export class PolygonWithZ extends Polygon {
    protected _coordinatesWithZ: Array<Array<[number, number, number]>>


    constructor(coordinates: Array<Array<Coordinate>>, layout, ends?: Array<number>, coordinatesWithZ?: Array<Array<[number, number, number]>>) {
        super(coordinates, layout, ends);
        this._coordinatesWithZ = coordinatesWithZ
    }

    get coordinatesWithZ(): Array<Array<[number, number, number]>> {
        return this._coordinatesWithZ
    }

    set coordinatesWithZ(coordinatesWithZ: Array<Array<[number, number, number]>>) {
        this._coordinatesWithZ = coordinatesWithZ
    }
}

export class MultiPolygonWithZ extends MultiPolygon {
    protected _coordinatesWithZ: Array<Array<Array<[number, number, number]>>>

    constructor(coordinates: Array<Array<Array<Coordinate>> | Polygon> | Array<number>, layout, endss?: number[][] | undefined, coordinatesWithZ?: Array<Array<Array<[number, number, number]>>>) {
        super(coordinates, layout, endss);
        this._coordinatesWithZ = coordinatesWithZ
    }

    get coordinatesWithZ(): Array<Array<Array<[number, number, number]>>> {
        return this._coordinatesWithZ
    }

    set coordinatesWithZ(coordinatesWithZ: Array<Array<Array<[number, number, number]>>>) {
        this._coordinatesWithZ = coordinatesWithZ
    }
}

