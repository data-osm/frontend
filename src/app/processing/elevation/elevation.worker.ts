/// <reference lib="webworker" />


import listElevation from "./listElevation";


addEventListener('message', async ({ data }) => {
    // const t0 = performance.now();
    const payload = data.payload
    await listElevation(payload.coordinates_with_index, payload.capabilities).then((result) => {
        postMessage({
            requestId: data.id,
            payload: {
                "elevations": result,
            },
        });
    })
    // const t1 = performance.now();
    // console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`, data.coordinates_with_index.length);
});





