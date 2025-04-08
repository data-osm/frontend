import { Fog } from "three";
import { Instance } from "../giro-3d-module";

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



