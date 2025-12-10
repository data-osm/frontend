import { GetImageOptions, ImageResponse, ImageResult, ImageSourceOptions } from "@giro3d/cgiro3d/sources/ImageSource";
import { Extent, ImageSource, MemoryTracker, OLUtils, PromiseUtils, WorkerPool } from "../giro-3d-module";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, LinearFilter, Group, Mesh, MeshBasicMaterial, OrthographicCamera, RenderTarget, RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderer, WebGLRenderTarget, Box3, Vector3, NearestFilter, ClampToEdgeWrapping, DataTexture, DataArrayTexture, ShaderLib, ShaderChunk } from "three";
import { Projection } from "ol/proj";
import { MVT, VectorTileSource } from "../ol-module";
import { environment } from "../../environments/environment";
import { createXYZ, TileGrid } from "ol/tilegrid";
import OpenLayersUtils from "@giro3d/cgiro3d/utils/OpenLayersUtils";
import { TileRange } from "ol";
import { UrlFunction } from "ol/Tile";
import { BuildingProcessingMessageMap, buildingProcessingMessageType, RequestFeaturesProcessingInTile } from "./building-processing-worker/building.worker";
import { createBuildingProcessingWorker } from "./building-processing-worker/pool";
import { getBottomLeft } from "ol/extent";
import { RetrieveHugging, RetrieveProjected } from "./building/type";
import { texture } from "three/src/nodes/TSL";
import { SunSystem } from "./sunSystem";
import { LightAndShadowSystem } from "./lightAndShadowSystem";

import LightProjectedFragment from "../../assets/shaders/light_projected.fragment.glsl";
import LightProjectedVertex from "../../assets/shaders/light_projected.vertex.glsl";
import { BehaviorSubject, combineLatest, filter, firstValueFrom, forkJoin, from, last, lastValueFrom, map, of, ReplaySubject, Subject, take, tap } from "rxjs";


const MIN_LEVEL_THRESHOLD = 2;
const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

const tmp = {
    dims: new Vector2(),
    tileRange: new TileRange(0, 0, 0, 0),
};
const tempVec3 = new Vector3()

export interface WebGLImageSourceOptions extends ImageSourceOptions {
    capabilities: any
    renderer: WebGLRenderer,
    projectedTexture: DataArrayTexture
}

export default class WebGLImageSource extends ImageSource {
    readonly olprojection: Projection;
    private readonly _sourceExtent: Extent;
    private readonly _tileGrid: TileGrid;
    private readonly _offScreen: Scene;
    private readonly _renderTarget: WebGLRenderTarget
    private readonly _projectedTexture: DataArrayTexture
    private featuresPerTile: Map<string | number, Array<RetrieveProjected | RetrieveHugging>> = new Map()
    private tileStatus: Map<string | number, BehaviorSubject<"LOAD" | "LOADING">> = new Map()

    vectorTileSource = new VectorTileSource({
        projection: 'EPSG:3857',
        format: new MVT(),
        url: environment.building_tile,

        tileGrid: createXYZ({ tileSize: 512 })
    });
    buildingProcessingWorker: WorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap> = new WorkerPool<buildingProcessingMessageType, BuildingProcessingMessageMap>({ createWorker: createBuildingProcessingWorker });
    capabilities: any
    projectedMaterial: ShaderMaterial
    renderer: WebGLRenderer

    readonly info = {
        requestedTiles: 0,
        loadedTiles: 0,
        maxLoadingTime: 0
    };

    constructor(options: WebGLImageSourceOptions) {
        super({
            ...options,
            flipY: false,
            is8bit: false,
            requestPriority: 'high',
        });


        this.olprojection = new Projection({ code: "EPSG:3857" })
        this._tileGrid = this.vectorTileSource.tileGrid
        this.capabilities = options.capabilities
        this.renderer = options.renderer
        this._projectedTexture = options.projectedTexture
        this.renderer.setClearColor(0x000000, 0);

        this._sourceExtent = OpenLayersUtils.fromOLExtent(this._tileGrid.getExtent(), this.olprojection.getCode());

        this._offScreen = new Scene();
        // this._offScreen.setRotationFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
        const size = 512 * 1;
        this._renderTarget = new WebGLRenderTarget(size, size, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat,
            type: UnsignedByteType,
            depthBuffer: true,
            stencilBuffer: false,
        });

    }

    getExtent() {

        return OpenLayersUtils.fromOLExtent(this.vectorTileSource.tileGrid.getExtent(), this.vectorTileSource.getProjection().getCode())
    }

    getCrs() {
        return this.vectorTileSource.getProjection().getCode();
    }



    getProjectedMaterial() {
        let projectedMaterial: ShaderMaterial

        if (!this.projectedMaterial) {

            this.projectedMaterial = new ShaderMaterial({
                side: DoubleSide,
                vertexShader: LightProjectedVertex,
                fragmentShader: LightProjectedFragment,
                // transparent: true,
                // uniforms: physicalUniforms,
                // depthWrite: false,
                // depthTest: false,
                // depthFunc: GreaterDepth,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1.0,

            })
            projectedMaterial = this.projectedMaterial
        } else {
            projectedMaterial = this.projectedMaterial.clone()
        }

        if (!Boolean(projectedMaterial.uniforms.tMapp)) {

            projectedMaterial.uniforms.tMapp = {
                value: this._projectedTexture
            }
        }

        return projectedMaterial
    }

    override adjustExtentAndPixelSize(
        requestExtent: Extent,
        requestWidth: number,
        requestHeight: number,
        margin = 0,
    ): { extent: Extent; width: number; height: number } {
        let zoom =
            this.getZoomLevel(requestExtent, requestWidth, requestHeight) ??
            this._tileGrid.getMinZoom();

        const resolution = this._tileGrid.getResolution(zoom);

        const pixelWidth = resolution;
        const pixelHeight = resolution;

        const marginExtent = requestExtent
            .withMargin(pixelWidth * margin, pixelHeight * margin)
            .intersect(this._sourceExtent);

        const dimensions = marginExtent.dimensions(tmp.dims);
        const width = Math.round(dimensions.x / pixelWidth);
        const height = Math.round(dimensions.y / pixelHeight);

        return {
            extent: marginExtent,
            width,
            height,
        };
    }

    private getZoomLevel(extent: Extent, width: number, height: number): number | null {
        const minZoom = this._tileGrid.getMinZoom();
        const maxZoom = this._tileGrid.getMaxZoom();

        function round1000000(n: number) {
            return Math.round(n * 1000000) / 1000000;
        }

        const dims = extent.dimensions(tmp.dims);
        const resX = dims.x / width;
        const resY = dims.y / height;
        const targetResolution = round1000000(Math.min(resX, resY));
        const minResolution = this._tileGrid.getResolution(minZoom);

        if (targetResolution / minResolution > MIN_LEVEL_THRESHOLD) {
            // The minimum zoom level has more than twice the resolution
            // than requested. We cannot use this zoom level as it would
            // trigger too many tile requests to fill the extent.
            return null;
        }

        if (minZoom === maxZoom) {
            return minZoom;
        }

        if (targetResolution > minResolution) {
            return minZoom;
        }

        // Let's determine the best zoom level for the target tile.
        let distance = +Infinity;
        let result = minZoom;
        for (let z = minZoom; z <= maxZoom; z++) {
            const sourceResolution = round1000000(this._tileGrid.getResolution(z));

            const thisDistance = Math.abs(sourceResolution - targetResolution);
            if (thisDistance < distance) {
                distance = thisDistance;
                result = z;
            }
        }


        return result;
    }

    getImages(options: GetImageOptions) {
        const { extent, width, height, signal } = options;

        signal?.throwIfAborted();

        if (extent.crs !== this.getCrs()) {
            throw new Error('invalid CRS');
        }

        let zoomLevel = this.getZoomLevel(extent, width, height);

        if (zoomLevel == null || zoomLevel < 14) {
            return [];
        }
        zoomLevel = 14;

        const tileRange = this._tileGrid.getTileRangeForExtentAndZ(
            OpenLayersUtils.toOLExtent(extent),
            zoomLevel,
        );
        const tiles = this.getTilesToLoad(
            tileRange,
            this.getCrs(),
            zoomLevel,
        );

        if (tiles.length == 0) {
            return []
        }

        const images: Array<ImageResponse> = [{
            id: options.id,
            request: () => PromiseUtils.delay(0).then(async () => {

                if (signal != null) {
                    // Let's wait a "frame" to check if the request is really necessary
                    // This will potentially avoid a lot of unnecessary requests.
                    await PromiseUtils.delay(25);

                    signal.throwIfAborted();
                }
                const t0 = performance.now();
                const features = await this.processFeaturesInExtent(tiles, extent)
                const image = this.rasterizeFeaturesInExtent(features, extent, options.id as string)

                const t1 = performance.now();
                this.info.maxLoadingTime = Math.max(this.info.maxLoadingTime, parseFloat((t1 - t0).toFixed(2)))
                // console.log(this.info, tiles.length, features, (t1 - t0).toFixed(2))


                return image
            })
        }]


        return images
    }

    private rasterizeFeaturesInExtent(tiles: (RetrieveProjected | RetrieveHugging)[], extent: Extent, id: string) {

        while (this._offScreen.children.length > 0) {
            this._offScreen.remove(this._offScreen.children[0]);
        }

        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const geometry = new BufferGeometry()
            tile.extrudeResult.geometryAttribute.forEach((geometryJson) => {
                geometry.setAttribute(geometryJson.key, new BufferAttribute(geometryJson.array, geometryJson.itemSize, geometryJson.normalized))
            })

            const material = this.getProjectedMaterial()

            if (tile.type === "hugging") {
                material.depthWrite = true
                material.transparent = true
            } else {
                material.depthWrite = false
                material.transparent = false
            }
            material.needsUpdate = true

            const tileExtent = OLUtils.fromOLExtent(tile.tileExtent, this.getCrs())
            const group = new Group()
            group.position.copy(tileExtent.bottomLeft().toVector3())
            group.position.z = 0

            const mesh = new Mesh(geometry, material)
            mesh.material.needsUpdate = true

            group.add(mesh)

            group.updateMatrixWorld(true)
            mesh.updateMatrixWorld(true)
            mesh.updateMatrix()

            this._offScreen.add(group)
        }


        const extentDimensions = extent.dimensions();
        const width = extentDimensions.y;
        const height = extentDimensions.x;


        const rtCamera = new OrthographicCamera(
            extent.west, extent.east,   // left, right
            extent.north, extent.south,
            0.1,
            100
        );

        rtCamera.position.set(0, 0, 100);
        rtCamera.lookAt(new Vector3(0, 0, 0));
        rtCamera.rotateZ(-Math.PI / 2);
        rtCamera.updateProjectionMatrix();



        this._offScreen.add(rtCamera)
        this._offScreen.updateMatrixWorld(true)



        this.renderer.setRenderTarget(this._renderTarget);
        this.renderer.setClearColor(0x000000, 0); // transparence
        this.renderer.clear(true, true, true);
        this.renderer.render(this._offScreen, rtCamera);
        this.renderer.setRenderTarget(null);
        const w = this._renderTarget.width;
        const h = this._renderTarget.height;

        const buffer = new Uint8Array(w * h * 4);
        this.renderer.readRenderTargetPixels(this._renderTarget, 0, 0, w, h, buffer);
        const tex = new DataTexture(buffer, w, h, RGBAFormat);

        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
        tex.generateMipmaps = false;
        tex.name = 'WebGLImageSource - tile';
        tex.needsUpdate = true;

        // const box = new Box3().setFromObject(this._offScreen);
        // const sceneExtent = Extent.fromBox3(this.getCrs(), box)
        // console.log(cx , extent.center().x, sceneExtent.intersectsExtent(extent), extent.contains(sceneExtent), sceneExtent.contains(extent))

        MemoryTracker.track(tex, tex.name);
        this.info.loadedTiles++;
        return new ImageResult({ texture: tex, extent: extent, id })

    }

    private async processFeaturesInExtent(tiles: RequestFeaturesProcessingInTile[], extent: Extent): Promise<(RetrieveProjected | RetrieveHugging)[]> {
        if (tiles.length == 0) {
            return []
        }
        const projectedFeatures: (RetrieveProjected | RetrieveHugging)[] = [];

        const tilesNotLoaded: RequestFeaturesProcessingInTile[] = []
        const loadingTiles: RequestFeaturesProcessingInTile[] = []

        tiles.forEach((tile) => {

            if (this.featuresPerTile.has(tile.id)) {
                // Tiles already load
                projectedFeatures.push(...this.featuresPerTile.get(tile.id))
            } else if (this.tileStatus.has(tile.id) && this.tileStatus.get(tile.id).value == "LOADING") {
                // Tiles in loading state
                loadingTiles.push(tile)
            } else {
                // Tiles not loaded and not in loading state
                tilesNotLoaded.push(tile)
            }
        })


        // We start by loading unloaded tiles
        if (tilesNotLoaded.length > 0) {
            tilesNotLoaded.forEach((tile) => {
                this.tileStatus.set(tile.id, new BehaviorSubject("LOADING"));
            })

            const payload: BuildingProcessingMessageMap["buildingProcessing"]["payload"] = {
                type: 'fetch',
                tiles: tilesNotLoaded,
                segment: 32,
                capabilities: this.capabilities,
                skirtOffset: null,
                outlineHeight: null,
                lczZones: null,
                defaultElevation: 0,
                excludeLayers: ["points", "buildings"]
            }
            this.info.requestedTiles++;
            const e = await this.buildingProcessingWorker.queue("buildingProcessing", payload)
            for (let i = 0; i < e.result.length; i++) {
                const tileResult = e.result[i];

                if (tileResult.projected) {
                    for (let j = 0; j < tileResult.projected.length; j++) {
                        const projected = tileResult.projected[j];
                        const featuresInTile = this.featuresPerTile.get(tileResult.id) || []
                        featuresInTile.push(projected)
                        this.featuresPerTile.set(tileResult.id, featuresInTile)


                    }
                    projectedFeatures.push(...tileResult.projected)
                } else {
                    this.featuresPerTile.set(tileResult.id, [])
                }


            }


            tilesNotLoaded.forEach((tile) => {
                const tileStatus = this.tileStatus.get(tile.id)
                tileStatus.next("LOAD")
                // tileStatus.complete()
            })

        }

        // We load tiles that are in loading state
        if (loadingTiles.length > 0) {
            await firstValueFrom(
                combineLatest(
                    loadingTiles.map(tile =>
                        this.tileStatus.get(tile.id).asObservable()
                    )
                ).pipe(
                    map((statuses) =>
                        statuses.map((status, index) => ({
                            status,
                            id: loadingTiles[index].id,
                        }))
                    ),
                    filter(entries => entries.every(e => e.status === 'LOAD')),
                    take(1),
                    map(entries => entries.map(e => e.id))
                )
            );

            const tileResults = loadingTiles.map((tile) => {
                // console.log(this.featuresPerTile.get(tile.id), this.tileStatus.get(tile.id).value)
                return this.featuresPerTile.get(tile.id)
            }).reduce<(RetrieveProjected | RetrieveHugging)[]>((acc, row) => {
                acc.push(...row);
                return acc;
            }, []);

            projectedFeatures.push(...tileResults)

        }


        return projectedFeatures
    }



    private getTileKey(x: number, y: number, z: number) {
        return `${z}/${x}/${y}`
    }

    private getTilesToLoad(
        tileRange: TileRange,
        crs: string,
        zoom: number,
    ) {
        const source = this.vectorTileSource;
        const tileGrid = this._tileGrid;

        const fullTileRange = tileGrid.getFullTileRange(zoom);

        if (fullTileRange == null) {
            return [];
        }

        const tiles: RequestFeaturesProcessingInTile[] = []

        for (let i = tileRange.minX; i <= tileRange.maxX; i++) {
            for (let j = tileRange.minY; j <= tileRange.maxY; j++) {
                if (!fullTileRange.containsXY(i, j)) {
                    continue;
                }

                const tile = source.getTile(zoom, i, j, 1, this.olprojection);
                const coord = tile.tileCoord;
                const olExtent = tileGrid.getTileCoordExtent(coord);
                const tileExtent = OpenLayersUtils.fromOLExtent(olExtent, crs);
                const id = this.getTileKey(coord[1], coord[2], coord[0]);
                const tileBottomLeft = tileExtent.bottomLeft()

                const url = environment.building_tile + "/" + coord[0] + "/" + coord[1] + "/" + coord[2] + ".pbf"

                tiles.push({
                    id,
                    x: coord[1],
                    y: coord[2],
                    z: coord[0],
                    tileExtent: olExtent,
                    url,
                    extentBottomLeft: [tileBottomLeft.x, tileBottomLeft.y],
                    tileSize: Math.min(...tileExtent.dimensions().toArray()),
                })
            }
        }

        return tiles;
    }


}