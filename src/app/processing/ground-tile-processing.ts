import { ReplaySubject } from "rxjs/internal/ReplaySubject";
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls } from "../giro-3d-module";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { concatMap, debounceTime, delay, filter, last, map, mergeAll, retryWhen, map as rxjsMap, shareReplay, switchMap, take, takeWhile, tap, withLatestFrom } from "rxjs/operators"
import { Box3, Box3Helper, BoxGeometry, DataArrayTexture, ImageLoader, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, PerspectiveCamera, RedFormat, RepeatWrapping, RGBAFormat, SRGBColorSpace, TextureLoader, UnsignedByteType, Vector3 } from "three";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper } from "../../helper/carto.helper";
import { Projection } from "ol/proj";
import { Feature, MVT, TileState, VectorTileSource } from "../ol-module";
import { environment } from "../../environments/environment";
import { TileCoord } from "ol/tilecoord";
import { BuildingLayer } from "./buildings";
import { TreeLayer } from "./trees";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { BehaviorSubject, combineLatest, forkJoin, from, interval, merge, Observable, of, Subject, zip, map as MapRxjs } from "rxjs";
import { SkeletonBuilder } from 'straight-skeleton';
import VectorRenderTile from "ol/VectorRenderTile";

const tmpBox3 = new Box3()

const textures = {
    "roofGeneric1Diffuse": { "url": "assets/textures/buildings/roofs/generic1_diffuse.png", "type": "image" },
    "roofGeneric1Normal": { "url": "assets/textures/buildings/roofs/generic1_normal.png", "type": "image" },
    "roofGeneric2Diffuse": { "url": "assets/textures/buildings/roofs/generic2_diffuse.png", "type": "image" },
    "roofGeneric2Normal": { "url": "assets/textures/buildings/roofs/generic2_normal.png", "type": "image" },

    "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/grey_roof_01_diff_1k.jpg", "type": "image" },
    // "roofGeneric3Diffuse": { "url": "assets/textures/buildings/roofs/generic3_diffuse.png", "type": "image" },
    "roofGeneric3Normal": { "url": "assets/textures/buildings/roofs/grey_roof_01_nor_dx_1k.jpg", "type": "image" },
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

    "facadeBrickWindowNormal": { "url": "assets/textures/buildings/facades/brick_window_normal.png", "type": "image" },
    "facadeBrickWindowMask": { "url": "assets/textures/buildings/facades/brick_window_mask.png", "type": "image" },
    "facadePlasterWallDiffuse": { "url": "assets/textures/buildings/facades/plaster_wall_diffuse.png", "type": "image" },
    "facadePlasterWallNormal": { "url": "assets/textures/buildings/facades/plaster_wall_normal.png", "type": "image" },

    "facadePlasterWallMask": { "url": "assets/textures/buildings/facades/plaster_wall_mask.png", "type": "image" },
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
    textures['roofCommonMask'],
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

    // threeGlbLoaded:Sub
    instance: Instance
    map: Giro3DMap
    controls: OrbitControls

    vectorTileSource = new VectorTileSource({
        format: new MVT(),
        url: environment.building_tile,
        tileGrid: createXYZ({ tileSize: 512 })
    });

    buildingLayer: BuildingLayer
    treeLayer: TreeLayer

    // private loader: TextureLoader = new TextureLoader();
    private loader = new ImageLoader();


    constructor(
        map: Giro3DMap,
    ) {

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls

        this.buildingLayer = new BuildingLayer(map = this.map)



        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('assets/draco/')

        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)

        let threeGlbLoaded = false
        gltfLoader.load(
            'assets/models/tree/tree.glb',
            (gltf) => {
                threeGlbLoaded = true
                this.treeLayer = new TreeLayer(map = this.map, gltf)
            }
        )


        fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
            // debounceTime(100),
            filter(() => threeGlbLoaded),
            withLatestFrom(this.loadBuildingTextures()),
            // withLatestFrom(from("undefined").pipe(take(1))),
            withLatestFrom(from(SkeletonBuilder.init()).pipe(take(1))),
            rxjsMap(([[instanceCamera, texture], skeleton]) => {


                this.buildingLayer.setBuildingTexture(texture.buildingTexture, texture.noiseTexture)

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
                this.treeLayer.currentZoomChanged(z)
                return [z, mapWith]
            }),
            filter((zAndMapWith) => zAndMapWith[0] >= 16),
            rxjsMap((zAndMapWith) => {
                const mapExtent = CartoHelper.getMapExtent(this.map)

                if (mapExtent == undefined) {
                    throw "Could not compute the map extent";
                }

                const olExtent = OLUtils.toOLExtent(mapExtent);
                const targetProjection = new Projection({ code: "EPSG:3857" });
                let mapWith = zAndMapWith[1]

                let target_resolution = mapWith / this.map["_instance"].domElement.width


                const tilesToLoad: VectorRenderTile[] = []
                this.vectorTileSource.tileGrid.forEachTileCoord(olExtent, 16, (tileCoord: TileCoord) => {
                    const z = tileCoord[0]
                    const x = tileCoord[1]
                    const y = tileCoord[2]


                    const currentTile = this.vectorTileSource.getTile(z, x, y, target_resolution, targetProjection)

                    if (currentTile.getState() == TileState.IDLE) {
                        currentTile.getSourceTiles()
                        tilesToLoad.push(currentTile)
                    }
                })

                if (tilesToLoad.length > 0) {
                    const getTileState_ = (): { tile: VectorRenderTile, state: number }[] => {
                        return tilesToLoad.map((tile) => ({ tile, state: tile.getState() }));
                    };

                    const getTileState = () => {
                        return tilesToLoad.map((tile) => tile.getState())
                    };
                    const getTileState$ = new BehaviorSubject(getTileState());

                    // Periodically update the BehaviorSubject with new tile states
                    const updateTileStateSubscription = interval(500).subscribe(() => {
                        getTileState$.next(getTileState());
                    });

                    getTileState$
                        .pipe(
                            MapRxjs(values => values.every(value => value != TileState.LOADING && value != TileState.IDLE)),
                            takeWhile(allLoaded => !allLoaded, true),
                            filter((allLoaded) => allLoaded),
                            // switchMap(() => {
                            //     return of(...tilesToLoad).pipe(concatMap(value => of(value).pipe(delay(10))))
                            // }),
                            // tap((tile) => {
                            //     const parentX = Math.floor(tile.tileCoord[1] / 2);
                            //     const parentY = Math.floor(tile.tileCoord[2] / 2);
                            //     const parentZ = tile.tileCoord[0] - 1

                            //     const parentTile = this.vectorTileSource.getTile(parentZ, parentX, parentY, target_resolution, targetProjection)

                            //     this.treeLayer.extentLoadEnd(this.vectorTileSource, [tile])
                            //     this.buildingLayer.extentLoadEnd(this.vectorTileSource, [tile], parentTile.tileCoord)
                            //     updateTileStateSubscription.unsubscribe(); // Unsubscribing interval when condition met
                            // })
                            // concatMap((x, i) => of(i).pipe(delay(500)).pipe(
                            //     tap((i) => {
                            //         const tile = tilesToLoad[i]
                            //         console.log(i, tilesToLoad.length)
                            //         this.buildingLayer.extentLoadEnd(this.vectorTileSource, [tile])
                            //         this.treeLayer.extentLoadEnd(this.vectorTileSource, [tile])
                            //         updateTileStateSubscription.unsubscribe(); // Unsubscribing interval when condition met
                            //     })
                            // ))
                        ).subscribe(() => {
                            this.buildingLayer.extentLoadEnd(this.vectorTileSource, tilesToLoad, tilesToLoad[0].tileCoord)
                            this.treeLayer.extentLoadEnd(this.vectorTileSource, tilesToLoad)
                            // for (let index = 0; index < tilesToLoad.length; index++) {
                            //     // if (index >= 3) {
                            //     //     break
                            //     // }
                            //     const tile = tilesToLoad[index];
                            //     const parentX = Math.floor(tile.tileCoord[1] / 2);
                            //     const parentY = Math.floor(tile.tileCoord[2] / 2);
                            //     const parentZ = tile.tileCoord[0] - 1

                            //     const parentTile = this.vectorTileSource.getTile(parentZ, parentX, parentY, target_resolution, targetProjection)

                            //     this.buildingLayer.extentLoadEnd(this.vectorTileSource, [tile], parentTile.tileCoord)
                            // }
                            updateTileStateSubscription.unsubscribe(); // Unsubscribing interval when condition met
                        })
                    // .subscribe((i) => {
                    //     const tile = tilesToLoad[i]
                    //     console.log(i, tilesToLoad.length)
                    //     this.buildingLayer.extentLoadEnd(this.vectorTileSource, [tile])
                    //     this.treeLayer.extentLoadEnd(this.vectorTileSource, [tile])
                    //     updateTileStateSubscription.unsubscribe(); // Unsubscribing interval when condition met
                    // });

                }
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

        // this.vectorTileSource.on("tileloaderror", () => {
        //     this.tileLoad$.next(undefined)
        // })

        this.vectorTileSource.on("tileloadend", (event: any) => {
            // this.tileLoad$.next(undefined)
            // console.log(
            //     [...new Set((event.tile.getFeatures() as Array<Feature>).map((feat) => feat.getProperties()["layer"]))], "layer",
            // console.log([...new Set((event.tile.getFeatures().filter((feat) => feat.getProperties()["layer"] == "buildings") as Array<Feature>).map((feat) => feat.getProperties()["type"]))], "type")
            // )
            // Type : 
            //"fence"
            //  "wall"
            // "building"
            // "grass"
            // "garden"
            // "construction"
            // "path"
            // "treeRow"
            // "busStop"
            // "tree"
            //: "statue"
            //: "sculpture"
            //: "streetLamp"
            //: "flagpole"
            //: "bench"
            //: "fireHydrant"
            //: "fountain"
            //: "water"
            // 

            let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && ["bench", "construction", "streetLamp", "busStop"].indexOf(feat.getProperties()["type"]) == -1)
            // Skillion 3543309932, 3543309922
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "skillion" && [3543309922].indexOf(feat["id_"]) != -1)
            //gabled 11968231872, 11968231882
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "gabled" && [8222909922].indexOf(feat["id_"]) != -1) //&& 11968231882[8222909922].indexOf(feat["id_"]) != -1
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && (feat.getProperties()["roofType"] == "gabled" || feat.getProperties()["roofType"] == "skillion"))
            //hipped [538149142,538149192,11955590662]
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "hipped")
            //onion 7749609502, 7749609512, 7749609542, 7749609562, 7749609572, 7749609682, 7749609692
            // gambrel
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "onion")
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "saltbox")
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings").map((feat) => { feat.getProperties()["roofType"] = "flat"; return feat })
            // trop de fenêtres 646236542 onion
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "flat" && feat["id_"] == 646236542)
            // Sans mur 690747272
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "flat" && feat["id_"] == 690747272)
            // L'exemple par defaut
            // let buildingFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "buildings" && feat.getProperties()["roofType"] == "flat" && feat["id_"] == 698606862)
            // http://localhost:4200/map?profil=1&layers=253,11,layer&pos=256600.6,6250747.9,262.7,256421.9,6250882.7,0




            // if (buildingFeatures.length > 0) {

            //     this.buildingLayer.processFeatures(buildingFeatures)
            // }

            // let threeFeatures = (event.tile.getFeatures() as Array<Feature>).filter((feat) => feat.getProperties()["layer"] == "point" && feat.getProperties()["type"] == "tree")
            // if (threeFeatures.length > 0) {
            //     this.treeLayer.processFeatures(threeFeatures)
            // }
        })
    }

    loadBuildingTextures() {
        const textureSWidth = 512
        const textureSHeight = 512
        const depth = textureSWidth * textureSHeight * Object.keys(buildingTextures).length * 4;  // RGBA, 4 channels per pixel
        const textureData = new Uint8Array(depth);

        const loadTextures$: Array<Observable<ImageData>> = []
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
            withLatestFrom(loader.loadAsync(noiseTextureUrl)),
            map(([_, noiseTexture]) => {
                const buildingTexture = new DataArrayTexture(textureData, textureSWidth, textureSHeight, buildingTextures.length);
                buildingTexture.format = RGBAFormat;
                buildingTexture.internalFormat = "RGBA8"
                buildingTexture.type = UnsignedByteType;
                buildingTexture.colorSpace = SRGBColorSpace;
                buildingTexture.generateMipmaps = true;
                buildingTexture.magFilter = LinearFilter
                buildingTexture.wrapS = RepeatWrapping
                buildingTexture.wrapT = RepeatWrapping
                buildingTexture.minFilter = LinearMipmapLinearFilter;
                // buildingTexture.flipY = true
                buildingTexture.needsUpdate = true;
                buildingTexture.anisotropy = 16;

                noiseTexture.format = RGBAFormat;
                noiseTexture.internalFormat = "RGBA8"
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