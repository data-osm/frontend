import { ReplaySubject } from "rxjs/internal/ReplaySubject";
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, tile, Coordinates, Extent, PoolWorker } from "../giro-3d-module";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { concatMap, debounceTime, delay, distinctUntilChanged, filter, last, map, mergeAll, retryWhen, map as rxjsMap, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, throttleTime, withLatestFrom } from "rxjs/operators"
import { Box3, Box3Helper, BoxGeometry, BoxHelper, ClampToEdgeWrapping, Color, DataArrayTexture, DirectionalLight, ImageLoader, Line, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, PerspectiveCamera, RedFormat, RepeatWrapping, RGBAFormat, RGBIntegerFormat, SRGBColorSpace, TextureLoader, TypedArray, UnsignedByteType, Vector2, Vector3 } from "three";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper } from "../../helper/carto.helper";
import { Projection } from "ol/proj";
import { Feature, Geometry, getCenter, MVT, TileState, VectorTileSource } from "../ol-module";
import { environment } from "../../environments/environment";
import { TileCoord } from "ol/tilecoord";
import { BuildingLayer } from "./buildings";
import { TreeLayer } from "./trees";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { BehaviorSubject, combineLatest, forkJoin, from, interval, merge, Observable, of, Subject, zip, map as MapRxjs, asyncScheduler, defer, OperatorFunction } from "rxjs";
import { SkeletonBuilder } from 'straight-skeleton';
import VectorRenderTile from "ol/VectorRenderTile";
import CSM from 'three-csm';
import { ParametersService } from "../data/services/parameters.service";

import Vec2 from "./math/vector2";
import Vec3 from "./math/vector3";
import { AppInjector } from "../../helper/app-injector.helper";
import { HttpClient } from "@angular/common/http";
import { createTileStateJob, JobQueue } from "./job-queue";
import { getBottomLeft } from "ol/extent";
import { createListElevationWorker, getCapabilities } from "./elevation/pool";
import { BuildingProcessingMessageMap, buildingProcessingMessageType, createBuildingProcessingWorker, createExtrudeWorker, RequestBuildingProcessing } from "./building-processing-worker/pool";
import { StreamWorkerPool } from "./worker-pool";
import { WireExtruded } from "./building-processing-worker/worker-packer";
import { on } from "events";
import { RetrieveBuilding, SourceFeature } from "./building/type";
import { SunSystem } from "./sunSystem";

const _tempCameraVec3 = new Vector3()
const tempBox3 = new Box3()
const tempVec3 = new Vector3()
const temp2Vec3 = new Vector3()
const tempVec2 = new Vector2()
const textures = {
    "roofGeneric1Diffuse": { "url": "assets/textures/buildings/roofs/generic1_diffuse.png", "type": "image" },
    "roofGeneric1Normal": { "url": "assets/textures/buildings/roofs/generic1_normal.png", "type": "image" },
    "roofGeneric2Diffuse": { "url": "assets/textures/buildings/roofs/generic2_diffuse.png", "type": "image" },
    "roofGeneric2Normal": { "url": "assets/textures/buildings/roofs/generic2_normal.png", "type": "image" },

    "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_Color.jpg", "type": "image" },
    "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_NormalGL.png", "type": "image" },
    "roofGeneric3Mask": { "url": "assets/textures/buildings/roofs/Plastic018A_1K-JPG_Roughness.png", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_Color.jpg", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_NormalGL.jpg", "type": "image" },
    // "roofGeneric3Mask": { "url": "assets/textures/buildings/roofs/Plastic001_1K-JPG_Roughness.jpg", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/grey_roof_01_diff_1k.jpg", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/generic3_diffuse.png", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/grey_roof_01_nor_dx_1k.jpg", "type": "image" },
    // "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/generic3_normal.png", "type": "image" },
    "roofGeneric4Diffuse": { "url": "assets/textures/buildings/roofs/generic4_diffuse.png", "type": "image" },
    "roofGeneric4Normal": { "url": "assets/textures/buildings/roofs/generic4_normal.png", "type": "image" },

    "roofTilesDiffuse": { "url": "assets/textures/buildings/roofs/tiles_diffuse.png", "type": "image" },
    "roofTilesNormal": { "url": "assets/textures/buildings/roofs/tiles_normal.png", "type": "image" },
    "roofTilesMask": { "url": "assets/textures/buildings/roofs/tiles_mask.png", "type": "image" },

    "roofMetalDiffuse": { "url": "assets/textures/buildings/roofs/metal_diffuse.png", "type": "image" },
    "roofMetalNormal": { "url": "assets/textures/buildings/roofs/metal_normal.png", "type": "image" },
    "roofMetalMask": { "url": "assets/textures/buildings/roofs/metal_mask.png", "type": "image" },
    "roofConcreteDiffuse": { "url": "assets/textures/buildings/roofs/concrete_diffuse.png", "type": "image" },
    "roofConcreteNormal": { "url": "assets/textures/buildings/roofs/concrete_normal.png", "type": "image" },

    "roofConcreteMask": { "url": "assets/textures/buildings/roofs/concrete_mask.png", "type": "image" },
    "roofThatchDiffuse": { "url": "assets/textures/buildings/roofs/thatch_diffuse.png", "type": "image" },
    "roofThatchNormal": { "url": "assets/textures/buildings/roofs/thatch_normal.png", "type": "image" },
    "roofThatchMask": { "url": "assets/textures/buildings/roofs/thatch_mask.png", "type": "image" },

    "roofEternitDiffuse": { "url": "assets/textures/buildings/roofs/eternit_diffuse.png", "type": "image" },
    "roofEternitNormal": { "url": "assets/textures/buildings/roofs/eternit_normal.png", "type": "image" },
    "roofEternitMask": { "url": "assets/textures/buildings/roofs/eternit_mask.png", "type": "image" },
    "roofGrassDiffuse": { "url": "assets/textures/buildings/roofs/grass_diffuse.png", "type": "image" },

    "roofGrassNormal": { "url": "assets/textures/buildings/roofs/grass_normal.png", "type": "image" },
    "roofGrassMask": { "url": "assets/textures/buildings/roofs/grass_mask.png", "type": "image" },
    "roofGlassDiffuse": { "url": "assets/textures/buildings/roofs/glass_diffuse.png", "type": "image" },
    "roofGlassNormal": { "url": "assets/textures/buildings/roofs/glass_normal.png", "type": "image" },

    "roofGlassMask": { "url": "assets/textures/buildings/roofs/glass_mask.png", "type": "image" },
    "roofTarDiffuse": { "url": "assets/textures/buildings/roofs/tar_diffuse.png", "type": "image" },
    "roofTarNormal": { "url": "assets/textures/buildings/roofs/tar_normal.png", "type": "image" },
    "roofTarMask": { "url": "assets/textures/buildings/roofs/tar_mask.png", "type": "image" },

    "roofCommonMask": { "url": "assets/textures/buildings/roofs/grey_roof_01_arm_1k.jpg", "type": "image" },
    // "roofCommonMask": { "url": "assets/textures/buildings/roofs/common_mask.png", "type": "image" },
    "facadeGlassDiffuse": { "url": "assets/textures/buildings/facades/glass_diffuse.png", "type": "image" },
    "facadeGlassNormal": { "url": "assets/textures/buildings/facades/glass_normal.png", "type": "image" },
    "facadeGlassMask": { "url": "assets/textures/buildings/facades/glass_mask.png", "type": "image" },

    "facadeBrickWallDiffuse": { "url": "assets/textures/buildings/facades/brick_wall_diffuse.png", "type": "image" },
    "facadeBrickWallNormal": { "url": "assets/textures/buildings/facades/brick_wall_normal.png", "type": "image" },
    "facadeBrickWallMask": { "url": "assets/textures/buildings/facades/brick_wall_mask.png", "type": "image" },
    "facadeBrickWindowDiffuse": { "url": "assets/textures/buildings/facades/brick_window_diffuse.png", "type": "image" },


    "facadePlasterWallDiffuse": { "url": "assets/textures/buildings/facades/plastered_wall_02_diff_1k.jpg", "type": "image" },
    "facadePlasterWallNormal": { "url": "assets/textures/buildings/facades/plastered_wall_02_nor_gl_1k.jpg", "type": "image" },
    "facadePlasterWallMask": { "url": "assets/textures/buildings/facades/plastered_wall_02_arm_1k.png", "type": "image" },

    "facadeBrickWindowNormal": { "url": "assets/textures/buildings/facades/brick_window_normal.png", "type": "image" },
    "facadeBrickWindowMask": { "url": "assets/textures/buildings/facades/brick_window_mask.png", "type": "image" },
    // "facadePlasterWallDiffuse": { "url": "assets/textures/buildings/facades/plaster_wall_diffuse.png", "type": "image" },
    // "facadePlasterWallNormal": { "url": "assets/textures/buildings/facades/plaster_wall_normal.png", "type": "image" },
    // "facadePlasterWallMask": { "url": "assets/textures/buildings/facades/plaster_wall_mask.png", "type": "image" },


    "facadePlasterWindowDiffuse": { "url": "assets/textures/buildings/facades/plaster_window_diffuse.png", "type": "image" },
    "facadePlasterWindowNormal": { "url": "assets/textures/buildings/facades/plaster_window_normal.png", "type": "image" },
    "facadePlasterWindowMask": { "url": "assets/textures/buildings/facades/plaster_window_mask.png", "type": "image" },

    "facadeWoodWallDiffuse": { "url": "assets/textures/buildings/facades/wood_wall_diffuse.png", "type": "image" },
    "facadeWoodWallNormal": { "url": "assets/textures/buildings/facades/wood_wall_normal.png", "type": "image" },
    "facadeWoodWallMask": { "url": "assets/textures/buildings/facades/wood_wall_mask.png", "type": "image" },
    "facadeWoodWindowDiffuse": { "url": "assets/textures/buildings/facades/wood_window_diffuse.png", "type": "image" },

    "facadeWoodWindowNormal": { "url": "assets/textures/buildings/facades/wood_window_normal.png", "type": "image" },
    "facadeWoodWindowMask": { "url": "assets/textures/buildings/facades/wood_window_mask.png", "type": "image" },
    "facadeBlockWallDiffuse": { "url": "assets/textures/buildings/facades/block_wall_diffuse.png", "type": "image" },
    "facadeBlockWallNormal": { "url": "assets/textures/buildings/facades/block_wall_normal.png", "type": "image" },

    "facadeBlockWallMask": { "url": "assets/textures/buildings/facades/block_wall_mask.png", "type": "image" },
    "facadeBlockWindowDiffuse": { "url": "assets/textures/buildings/facades/block_window_diffuse.png", "type": "image" },
    "facadeBlockWindowNormal": { "url": "assets/textures/buildings/facades/block_window_normal.png", "type": "image" },
    "facadeBlockWindowMask": { "url": "assets/textures/buildings/facades/block_window_mask.png", "type": "image" },

    "window0Glow": { "url": "assets/textures/buildings/facades/window0_glow.png", "type": "image" },
    "window1Glow": { "url": "assets/textures/buildings/facades/window1_glow.png", "type": "image" },
    "glassGlow": { "url": "assets/textures/buildings/facades/glass_glow.png", "type": "image" },
    "noGlow": { "url": "assets/textures/buildings/facades/no_glow.png", "type": "image" },
}

const buildingTextures = [
    textures['roofGeneric1Diffuse'],
    textures['roofGeneric1Normal'],
    textures['roofCommonMask'],
    textures['noGlow'],

    textures['roofGeneric2Diffuse'],
    textures['roofGeneric2Normal'],
    textures['roofCommonMask'],
    textures['noGlow'],

    textures['roofGeneric3Diffuse'],
    textures['roofGeneric3Normal'],
    textures['roofGeneric3Mask'],
    textures['noGlow'],

    textures['roofGeneric4Diffuse'],
    textures['roofGeneric4Normal'],
    textures['roofCommonMask'],
    textures['noGlow'],

    textures['roofTilesDiffuse'],
    textures['roofTilesNormal'],
    textures['roofTilesMask'],
    textures['noGlow'],

    textures['roofMetalDiffuse'],
    textures['roofMetalNormal'],
    textures['roofMetalMask'],
    textures['noGlow'],

    textures['roofConcreteDiffuse'],
    textures['roofConcreteNormal'],
    textures['roofConcreteMask'],
    textures['noGlow'],

    textures['roofThatchDiffuse'],
    textures['roofThatchNormal'],
    textures['roofThatchMask'],
    textures['noGlow'],

    textures['roofEternitDiffuse'],
    textures['roofEternitNormal'],
    textures['roofEternitMask'],
    textures['noGlow'],

    textures['roofGrassDiffuse'],
    textures['roofGrassNormal'],
    textures['roofGrassMask'],
    textures['noGlow'],

    textures['roofGlassDiffuse'],
    textures['roofGlassNormal'],
    textures['roofGlassMask'],
    textures['noGlow'],

    textures['roofTarDiffuse'],
    textures['roofTarNormal'],
    textures['roofTarMask'],
    textures['noGlow'],

    textures['facadeGlassDiffuse'],
    textures['facadeGlassNormal'],
    textures['facadeGlassMask'],
    textures['glassGlow'],

    textures['facadeBrickWallDiffuse'],
    textures['facadeBrickWallNormal'],
    textures['facadeBrickWallMask'],
    textures['noGlow'],

    textures['facadeBrickWindowDiffuse'],
    textures['facadeBrickWindowNormal'],
    textures['facadeBrickWindowMask'],
    textures['window0Glow'],
    // 15
    textures['facadePlasterWallDiffuse'],
    textures['facadePlasterWallNormal'],
    textures['facadePlasterWallMask'],
    textures['noGlow'],

    textures['facadePlasterWindowDiffuse'],
    textures['facadePlasterWindowNormal'],
    textures['facadePlasterWindowMask'],
    textures['window1Glow'],

    textures['facadeWoodWallDiffuse'],
    textures['facadeWoodWallNormal'],
    textures['facadeWoodWallMask'],
    textures['noGlow'],

    textures['facadeWoodWindowDiffuse'],
    textures['facadeWoodWindowNormal'],
    textures['facadeWoodWindowMask'],
    textures['window0Glow'],

    textures['facadeBlockWallDiffuse'],
    textures['facadeBlockWallNormal'],
    textures['facadeBlockWallMask'],
    textures['window0Glow'],

    textures['facadeBlockWindowDiffuse'],
    textures['facadeBlockWindowNormal'],
    textures['facadeBlockWindowMask'],
    textures['window1Glow'],

]
const noiseTextureUrl = "assets/textures/noise/noise.png"


export class GroundTileProcessing {

    instance: Instance
    map: Giro3DMap
    controls: OrbitControls

    vectorTileSource = new VectorTileSource({
        projection: 'EPSG:3857',
        format: new MVT(),
        url: environment.building_tile,
        tileGrid: createXYZ({ tileSize: 512 })
    });

    buildingLayer: BuildingLayer
    treeLayer: TreeLayer
    capabilities: any

    // private loader: TextureLoader = new TextureLoader();
    private loader = new ImageLoader();
    csm: CSM
    parametersService: ParametersService
    sunSystem: SunSystem

    buildingProcessingWorker: StreamWorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap>
    //@ts-expect-error
    worker: StreamWorkerPool

    requestTile: (b: Array<RequestBuildingProcessing>) => void

    constructor(
        map: Giro3DMap,
        parametersService: ParametersService,
        sunSystem: SunSystem,
        csm: CSM
    ) {
        this.sunSystem = sunSystem
        this.parametersService = parametersService

        this.buildingProcessingWorker = new StreamWorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap>({ createWorker: createBuildingProcessingWorker });

        this.worker = new StreamWorkerPool({ createWorker: createExtrudeWorker, concurrency: 2 });

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.buildingLayer = new BuildingLayer(this.map, this.vectorTileSource, csm, this.sunSystem)



        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('assets/draco/')

        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)

        const treeGltf$ = defer(() =>
            new Observable<GLTF>((observer) => {
                const loader = gltfLoader; // ton instance existante
                loader.load(
                    'assets/models/tree/tree.glb',
                    (gltf) => { observer.next(gltf); observer.complete(); },
                    undefined,
                    (err) => observer.error(err)
                );
            })
        ).pipe(
            take(1),
            shareReplay(1)
        );
        treeGltf$.subscribe((gltf) => {
            this.treeLayer = new TreeLayer((this.map), gltf);
        });
        // will also init skeleton
        // (this.worker.queue('ExtrudeBuildings', []) as PoolWorker);

        this.buildingProcessingWorker.queue("buildingProcessing", { type: 'config', concurrency: 8 });



        let nextId = 1;
        const pending = new Map<number, string>();   // jobId -> tileId "z/x/y"
        const inflightByTile = new Map<string, number>(); // tileId -> jobId
        const cachedTiles = new Map<string, string>();

        const inflightByTileExtent = new Map<string, Extent>();

        const failedTile = new Set<string>();

        const onTIleFailed = (id: number) => {
            const tileId = pending.get(id);
            pending.delete(id);
            inflightByTile.delete(tileId);
            failedTile.add(tileId)
        }

        const onTileSucceed = (id: number) => {
            const tileId = pending.get(id);
            // console.log("onTileSucceed", tileId, pending.delete(id))
            pending.delete(id);
            inflightByTile.delete(tileId);
            cachedTiles.set(tileId, tileId);
        }

        // const abortTileProcessing = (tileIds: number[]) => {
        //     // uniqueWorker.postMessage({
        //     //     id: null,
        //     //     payload: { "exec": "abort", tiles: [], tilesToAbort: [1] },
        //     //     type: "buildingProcessing",
        //     // }, [])
        //     // return
        //     const workers = [...this.worker._workers];
        //     // for (const w of workers) {
        //     //     (w.worker as PoolWorker).postMessage({
        //     //         id: null,
        //     //         payload: { "exec": "abort", tiles: [], "tilesToAbort": tileIds },
        //     //         type: "buildingProcessing",
        //     //     }, [])
        //     // }
        //     for (const tileId of tileIds) {
        //         const id = pending.get(tileId);
        //         pending.delete(tileId);
        //         inflightByTile.delete(id);
        //     }
        //     if (workers.length > 0) {
        //         (workers[0].worker as PoolWorker).postMessage({
        //             id: null,
        //             payload: { "exec": "abort", tiles: [], "tilesToAbort": tileIds },
        //             type: "buildingProcessing",
        //         }, [])
        //     }

        // }

        this.requestTile = (batchTile) => {

            batchTile.forEach(tile => {
                const tileId = `${tile.z}/${tile.x}/${tile.y}`;
                pending.set(tile.id, tileId);

            })
            // console.log(batchTile.length, 'tiles to fetch');

            this.buildingProcessingWorker.queue("buildingProcessing", { type: 'fetch', batchTile, capabilities: this.capabilities }).addEventListener('message', (e) => {
                const data: {
                    type: string
                    id?: number
                    tileResult: RetrieveBuilding[],
                    // @ts-expect-error
                } = e.data.payload

                // Tile have no features
                if (!Boolean(data.tileResult)) {
                    onTIleFailed(data.id)
                    return
                } else {
                    const tiles = data.tileResult
                    const tilesToLoad = []
                    for (const tile of tiles) {
                        if (!pending.has(tile.id)) {
                            continue
                        }
                        onTileSucceed(tile.id)
                        tilesToLoad.push(tile)
                    }
                    this.buildingLayer.loadFeatures(tilesToLoad);
                }

            })


        }



        const computeVisibleTiles = (olExtent: Extent, z: number) => {
            const tiles: Array<{ z: number; x: number; y: number }> = [];
            this.vectorTileSource.tileGrid.forEachTileCoord(olExtent as any, z, (tc) => {
                tiles.push({ z: tc[0], x: tc[1], y: tc[2] });
            });
            return tiles;
        }

        function tilePriority(t: { z: number; x: number; y: number }, c: { x: number; y: number }) {
            const R = 6378137, n = 2 ** t.z;
            const fx = (t.x + 0.5) / n, fy = (t.y + 0.5) / n;
            const mx = (fx - 0.5) * 2 * Math.PI * R;
            const my = (0.5 - fy) * 2 * Math.PI * R;
            const dx = mx - c.x, dy = my - c.y;
            return dx * dx + dy * dy;
        }

        const getCamPos = () => {
            this.instance.view.camera.getWorldPosition(_tempCameraVec3);
            return new Vec3(_tempCameraVec3.x, _tempCameraVec3.y, _tempCameraVec3.z);
        };

        const elevationCapabilities$ = from(getCapabilities()).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const textures$ = this.loadBuildingTextures().pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const skeleton$ = from(SkeletonBuilder.init()).pipe(take(1), shareReplay({ bufferSize: 1, refCount: true }));

        const cameraPos$ = fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
            // filter(() => threeGlbLoaded),
            rxjsMap((ev) => {
                // const controlTarget = new Vec3(this.controls.target.x, this.controls.target.y, this.controls.target.z)
                return getCamPos()
            }),
            debounceTime(150),

        );

        let forceInit: Vec3 = getCamPos()
        forceInit.x = forceInit.x + 200

        textures$.subscribe((texture) => {
            this.buildingLayer.setBuildingTexture(texture.buildingTexture, texture.noiseTexture)
        })
        elevationCapabilities$.subscribe((caps) => {
            this.capabilities = caps
        })
        let cameraLoading = 0
        cameraPos$.pipe(
            withLatestFrom(elevationCapabilities$),
            withLatestFrom(treeGltf$),
            withLatestFrom(textures$),
            switchMap(() => cameraPos$.pipe(startWith(forceInit))),
            // distinctUntilChanged((prev, curr) => {
            //     const distance = Math.abs(Vec3.distance(prev, curr))
            //     return distance < 100
            // }),
            rxjsMap(() => {
                // console.log("cameraMoved")
                const camera = this.instance.view.camera as PerspectiveCamera
                const focalLength = camera.position.distanceTo(this.controls.target);
                const fov = camera.fov * (Math.PI / 180);
                const aspect = camera.aspect;

                const heightNear = 2 * Math.tan(fov / 2) * focalLength;
                const mapWith = heightNear * aspect;

                const tileGrid = this.vectorTileSource.tileGrid
                let target_resolution = mapWith / this.map["_instance"].domElement.width

                // Compute Z of the map
                const z = tileGrid.getZForResolution(
                    target_resolution
                );
                this.buildingLayer.currentZoomChanged(z)
                // this.treeLayer.currentZoomChanged(z)

                return [z, mapWith]
            }),
            filter((zAndMapWith) => zAndMapWith[0] >= 16),
            filter(() => cameraLoading === 0),
            rxjsMap((zAndMapWith) => {
                cameraLoading = 1
                const mapWith = zAndMapWith[1]
                let mapBoundingBox = CartoHelper.getVisibleTileBoundingBox(this.map, 10000)
                if (mapBoundingBox.isEmpty()) {
                    cameraLoading = 0
                    throw new Error("Map bounding box is undefined when updating sun position")
                }

                mapBoundingBox.clone().getSize(tempVec3)
                const maxBoundingBoxSize = Math.max(tempVec3.x, tempVec3.y)
                if (maxBoundingBoxSize < 10000) {
                    mapBoundingBox = mapBoundingBox.expandByScalar((10000 - maxBoundingBoxSize) / 2)
                }
                //  else {

                //     // mapBoundingBox = clampBoxByViewDepth(mapBoundingBox.clone(), (this.map.instance.view.camera as PerspectiveCamera), 10000)
                // }
                const controlTarget = (map.instance.view.controls as OrbitControls).target
                // 10000

                const mapExtent = Extent.fromCenterAndSize("EPSG:3857", { x: controlTarget.x, y: controlTarget.y }, 10000, 10000)
                // const mapExtent = Extent.fromBox3("EPSG:3857", mapBoundingBox);
                //@ts-ignore
                const olExtent = OLUtils.toOLExtent(mapExtent) as Extent;


                const center3857 = { x: this.controls.target.x, y: this.controls.target.y }

                const visibleTiles = computeVisibleTiles(olExtent, 16)

                // // abortTileProcessing
                // const inflightTileIds = visibleTiles.filter(({ z, x, y }, index) => {
                //     const tileId = `${z}/${x}/${y}`;
                //     // console.log("ici", inflightByTile.has(tileId), inflightByTileExtent.has(tileId))
                //     return inflightByTile.has(tileId) && inflightByTileExtent.has(tileId);
                // }).filter(({ z, x, y }) => {
                //     const tileId = `${z}/${x}/${y}`;
                //     const bool = !mapExtent.intersectsExtent(inflightByTileExtent.get(tileId))
                //     // console.log("ici", bool)
                //     return bool
                // }).map(({ z, x, y }, index) => {
                //     const tileId = `${z}/${x}/${y}`;
                //     // parmis ceux ci encore en loading, quelles sont ceux qui ne sont pas la nouvelle vue => abort

                //     return inflightByTile.get(tileId)
                // })
                // if (inflightByTile.size > 0) {
                //     console.log(inflightByTile.size, "tiles to abort")
                //     // abortTileProcessing(inflightTileIds)
                // }

                let fresh = visibleTiles.filter(({ z, x, y }) => {
                    const tileId = `${z}/${x}/${y}`;
                    return !inflightByTile.has(tileId) && !cachedTiles.has(tileId);
                });

                if (fresh.length == 0) {
                    cameraLoading = 0
                    return
                }

                fresh.sort((a, b) => tilePriority(a, center3857) - tilePriority(b, center3857));

                const batch = fresh.map(({ z, x, y }) => {
                    const tileId = `${z}/${x}/${y}`;
                    const id = nextId++;
                    inflightByTile.set(tileId, id);
                    const url = "https://buildings.dataosm.info/maps/osm_data/" + z + "/" + x + "/" + y + ".pbf"
                    const tileExtent = this.vectorTileSource.tileGrid.getTileCoordExtent([z, x, y])
                    const tileBottomLeft = getBottomLeft(this.vectorTileSource.tileGrid.getTileCoordExtent([z, x, y]))

                    inflightByTileExtent.set(tileId, OLUtils.fromOLExtent(tileExtent, "EPSG:3857"));
                    return { id, z, x, y, url, tileExtent, tileBottomLeft: [tileBottomLeft[0], tileBottomLeft[1]] as [number, number] };
                });
                this.requestTile(batch);
                cameraLoading = 0




            }),
            retryWhen((errors) => {
                return errors.pipe(
                    tap(val => console.warn(val)),
                    delay(300),
                    // take(1)
                )
            }),
        )
            .subscribe()



    }


    updateGroundTilesVisibility(visibility) {
        this.buildingLayer.updateBuildingVisibility(visibility)
    }



    loadBuildingTextures() {
        const textureSWidth = 512
        const textureSHeight = 512

        const depth = textureSWidth * textureSHeight * Object.keys(buildingTextures).length * 4;  // RGBA, 4 channels per pixel
        const textureData = new Uint8Array(depth);
        const loadTextures$: Array<Observable<ImageData>> = []

        // const maskDepth = textureSWidth * textureSHeight * Object.keys(buildingTextures).length / 4 * 4;  // one mask per 4 images and RGBA, 4 channels per pixel
        // const loadMaskTextures$: Array<Observable<ImageData>> = []
        // const maskTextureData = new Uint8Array(maskDepth);

        // for (let index = 0; index < Object.keys(buildingTextures).length / 4; index++) {
        //     const position = (index * 4) + 2
        //     const element = buildingTextures[position];
        //     loadMaskTextures$.push(
        //         of(element).pipe(
        //             switchMap((element) => {
        //                 return from(this.loader.loadAsync(element.url)).pipe((map((image) => { return { image, index } })))
        //             }),
        //             map((parameter) => {
        //                 const canvas = document.createElement('canvas');
        //                 canvas.width = textureSWidth;
        //                 canvas.height = textureSHeight;
        //                 const context = canvas.getContext('2d');
        //                 context.drawImage(parameter.image, 0, 0);
        //                 const imageData = context.getImageData(0, 0, textureSWidth, textureSHeight);
        //                 maskTextureData.set(
        //                     imageData.data,
        //                     parameter.index * textureSWidth * textureSHeight * 4
        //                 );


        //                 return imageData
        //             }),
        //             last(), // load only once and replay the same last response
        //         )
        //     )
        // }

        for (let index = 0; index < buildingTextures.length; index++) {
            const element = buildingTextures[index];

            loadTextures$.push(
                of(element).pipe(
                    switchMap((element) => {
                        return from(this.loader.loadAsync(element.url)).pipe((map((image) => { return { image, index } })))
                    }),
                    map((parameter) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = textureSWidth;
                        canvas.height = textureSHeight;
                        const context = canvas.getContext('2d');
                        context.drawImage(parameter.image, 0, 0);
                        const imageData = context.getImageData(0, 0, textureSWidth, textureSHeight);

                        textureData.set(
                            imageData.data,
                            parameter.index * textureSWidth * textureSHeight * 4
                        );
                        return imageData
                    }),
                    last(), // load only once and replay the same last response
                )
            )

        }


        const loader = new TextureLoader()

        return combineLatest(loadTextures$).pipe(
            last(),// load only once and replay the same last response
            // withLatestFrom(...loadMaskTextures$),
            withLatestFrom(loader.loadAsync(noiseTextureUrl)),
            map(([_, noiseTexture]) => {
                const buildingTexture = new DataArrayTexture(textureData, textureSWidth, textureSHeight, buildingTextures.length);
                buildingTexture.format = RGBAFormat;
                // buildingTexture.internalFormat = "RGBA8"
                // buildingTexture.type = UnsignedByteType;
                buildingTexture.colorSpace = SRGBColorSpace;
                buildingTexture.generateMipmaps = true;
                buildingTexture.magFilter = LinearFilter;
                buildingTexture.minFilter = LinearMipmapLinearFilter;
                // buildingTexture.minFilter = LinearMipmapLinearFilter;
                buildingTexture.wrapS = RepeatWrapping
                buildingTexture.wrapT = RepeatWrapping
                // buildingTexture.flipY = true
                buildingTexture.needsUpdate = true;
                buildingTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();

                // const maskTexture = new DataArrayTexture(maskTextureData, textureSWidth, textureSHeight, buildingTextures.length / 4);
                // maskTexture.colorSpace = SRGBColorSpace;
                // // buildingTexture.format = RGBAFormat;
                // // buildingTexture.type = UnsignedByteType;
                // // maskTexture.generateMipmaps = true;
                // maskTexture.magFilter = LinearFilter;
                // maskTexture.minFilter = LinearFilter;
                // // maskTexture.minFilter = LinearMipmapLinearFilter;
                // maskTexture.wrapS = RepeatWrapping
                // maskTexture.wrapT = RepeatWrapping
                // // maskTexture.flipY = true
                // maskTexture.needsUpdate = true;
                // maskTexture.anisotropy = this.instance.renderer.capabilities.getMaxAnisotropy();


                noiseTexture.format = RGBAFormat;
                // noiseTexture.internalFormat = "RGBA8"
                noiseTexture.type = UnsignedByteType;
                noiseTexture.colorSpace = SRGBColorSpace;
                // noiseTexture.generateMipmaps = true;
                noiseTexture.magFilter = NearestFilter
                noiseTexture.wrapS = RepeatWrapping
                noiseTexture.wrapT = RepeatWrapping
                noiseTexture.minFilter = NearestFilter;
                // noiseTexture.flipY = true
                noiseTexture.needsUpdate = true;
                noiseTexture.anisotropy = 16;


                return { buildingTexture, noiseTexture }
            })
        )


    }



}
