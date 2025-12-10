import Extent from '@giro3d/cgiro3d/core/geographic/Extent.js';
import Instance from '@giro3d/cgiro3d/core/Instance.js';
import { GlobalCache } from '@giro3d/cgiro3d/core/Cache';
import Map, { MapEventMap } from "@giro3d/cgiro3d/entities/Map"



import Context from '@giro3d/cgiro3d/core/Context';
import Coordinates from '@giro3d/cgiro3d/core/geographic/Coordinates';
import { tile } from 'ol/loadingstrategy';
import FeatureCollection from '@giro3d/cgiro3d/entities/FeatureCollection.js';
import { GetMemoryUsageContext } from '@giro3d/cgiro3d/core/MemoryUsage';

import ColorLayer from '@giro3d/cgiro3d/core/layer/ColorLayer.js';
// import * as GiroVectorSource from '@giro3d/cgiro3d/sources/';
import WmtsSource from '@giro3d/cgiro3d/sources/WmtsSource.js';
import TiledImageSource from '@giro3d/cgiro3d/sources/TiledImageSource.js';
import WmsSource from '@giro3d/cgiro3d/sources/WmsSource.js';
import VectorTileSource from '@giro3d/cgiro3d/sources/VectorTileSource'
import ImageSource from '@giro3d/cgiro3d/sources/ImageSource'
// import { Layer, LayerEvents, LayerUserData } from '@giro3d/cgiro3d/core/layer'
import { PickObjectsAtOptions } from '@giro3d/cgiro3d/core/Instance'
import PickOptions from '@giro3d/cgiro3d/core/picking/PickOptions'
import Layer, { LayerEvents, LayerUserData, Target } from '@giro3d/cgiro3d/core/layer/Layer'
import { MapPickResult } from '@giro3d/cgiro3d/core/picking/PickTilesAt'
import ScreenSpaceError from '@giro3d/cgiro3d/core/ScreenSpaceError';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import LayeredMaterial from '@giro3d/cgiro3d/renderer/LayeredMaterial'

import VectorSource from '@giro3d/cgiro3d/sources/VectorSource';
import LayerUpdateState from '@giro3d/cgiro3d/core/layer/LayerUpdateState';
import OLUtils from '@giro3d/cgiro3d/utils/OpenLayersUtils';
import { InstanceEvents } from "@giro3d/cgiro3d/core/Instance";

// import Inspector from '@giro3d/cgiro3d/gui/Inspector.js';
import DrawToolPanel from '@giro3d/cgiro3d/gui/DrawToolPanel.js';
import ProcessingInspector from '@giro3d/cgiro3d/gui/ProcessingInspector'
import FrameDuration from "@giro3d/cgiro3d/gui/charts/FrameDuration"
import BilFormat from '@giro3d/cgiro3d/formats/BilFormat';
import ElevationLayer from '@giro3d/cgiro3d/core/layer/ElevationLayer';
import { MapLightingMode } from '@giro3d/cgiro3d/entities/MapLightingOptions';

import { FillStyle, StrokeStyle } from "@giro3d/cgiro3d/core/FeatureTypes";
import WorkerPool, { BaseMessageMap, PoolWorker } from "@giro3d/cgiro3d/utils/WorkerPool";

import COPCSource from '@giro3d/cgiro3d/sources/COPCSource.js';
import PointCloud from '@giro3d/cgiro3d/entities/PointCloud.js';
import ColorMap from '@giro3d/cgiro3d/core/ColorMap';
import { PointCloudAttribute, PointCloudMetadata } from '@giro3d/cgiro3d/sources/PointCloudSource';

import { TextureAndPitch } from "@giro3d/cgiro3d/core/layer/Layer";
import PlanarTileGeometry from "@giro3d/cgiro3d/entities/tiles/PlanarTileGeometry"


import { decodeRaster } from "@giro3d/cgiro3d/formats/bilWorker.js";
import HeightMap from '@giro3d/cgiro3d/core/HeightMap';
import { readRGRenderTargetIntoRGBAU8Buffer } from '@giro3d/cgiro3d/renderer/composition/WebGLComposer';
import MemoryTracker from '@giro3d/cgiro3d/renderer/MemoryTracker';
import PromiseUtils from '@giro3d/cgiro3d/utils/PromiseUtils';
export {
    Extent,
    LayerUpdateState,
    Instance,
    Map,
    // Inspector,
    Context,
    Coordinates,
    tile,
    FeatureCollection,
    GetMemoryUsageContext,
    ColorLayer,
    WmtsSource,
    TiledImageSource,
    WmsSource,
    ImageSource,
    PickObjectsAtOptions,
    PickOptions,
    Target,
    MapPickResult,
    ScreenSpaceError,
    OrbitControls,
    LayeredMaterial,
    VectorSource,
    MapEventMap,
    GlobalCache,
    Layer, LayerEvents, LayerUserData,
    OLUtils,
    InstanceEvents,
    // Inspector,
    DrawToolPanel,
    ProcessingInspector,
    FrameDuration,
    BilFormat,
    ElevationLayer,
    MapLightingMode,
    FillStyle,
    StrokeStyle,
    WorkerPool,
    BaseMessageMap,
    PoolWorker,
    COPCSource,
    PointCloud,
    ColorMap,
    PointCloudAttribute,
    PointCloudMetadata,
    TextureAndPitch,
    decodeRaster,
    VectorTileSource,
    PlanarTileGeometry,
    HeightMap,
    readRGRenderTargetIntoRGBAU8Buffer,
    MemoryTracker,
    PromiseUtils
}