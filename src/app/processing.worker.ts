/// <reference lib="webworker" />


import { SkeletonBuilder } from "straight-skeleton";
import { build3dBuildings } from "./processing/build3dBuilding";




let moduleReady: Promise<void>;


addEventListener('message', async ({ data }) => {
  await moduleReady;
  const result = build3dBuildings(data.features, data.worldBuildingPosition, data.tile_key);
  postMessage(result);
});


moduleReady = SkeletonBuilder.init().then(() => {
  // console.log('Module initialized');
});


