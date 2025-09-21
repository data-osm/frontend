/// <reference lib="webworker" />


import listElevation from "./listElevation";
import { ElevationFeature, GeometryType } from "./pool";


addEventListener('message', async ({ data }) => {
    // const t0 = performance.now();
    const payload = data.payload
    await listElevation(payload.features as Array<ElevationFeature>, payload.capabilities).then((result) => {
        postMessage({
            requestId: data.id,
            payload: result,
        });
    })
    // const t1 = performance.now();
    // console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`, data.coordinates_with_index.length);
});





