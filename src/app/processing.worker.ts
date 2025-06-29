/// <reference lib="webworker" />


import { SkeletonBuilder } from "straight-skeleton";
import { build3dBuildings } from "./processing/build3dBuilding";




let moduleReady: Promise<void>;


addEventListener('message', async ({ data }) => {
  // const t0 = performance.now();
  await moduleReady;
  // const t1 = performance.now();
  // console.log(data, "dtata");
  const payload = data.payload
  const result = build3dBuildings(payload.features, payload.worldBuildingPosition, payload.tile_key);
  // const t2 = performance.now();
  // console.log(`Temps écoulé build3dBuildings : ${(t1 - t0).toFixed(2)} ms, ${(t2 - t1).toFixed(2)} ms`, payload.features.length);

  postMessage(
    {
      requestId: data.id,
      payload: result,
    },
  );
});


moduleReady = SkeletonBuilder.init().then(() => {
  // console.log('Module initialized');
});


