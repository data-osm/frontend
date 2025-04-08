import Extent from '@giro3d/giro3d/core/geographic/Extent.js';
import Instance from '@giro3d/giro3d/core/Instance.js';
import { GlobalCache } from '@giro3d/giro3d/core/Cache';
import Map, { MapEventMap } from "@giro3d/giro3d/entities/Map"



import Context from '@giro3d/giro3d/core/Context';
import Coordinates from '@giro3d/giro3d/core/geographic/Coordinates';
import { tile } from 'ol/loadingstrategy';
import FeatureCollection from '@giro3d/giro3d/entities/FeatureCollection.js';
import { GetMemoryUsageContext } from '@giro3d/giro3d/core/MemoryUsage';

import ColorLayer from '@giro3d/giro3d/core/layer/ColorLayer.js';
// import * as GiroVectorSource from '@giro3d/giro3d/sources/';
import WmtsSource from '@giro3d/giro3d/sources/WmtsSource.js';
import TiledImageSource from '@giro3d/giro3d/sources/TiledImageSource.js';
import WmsSource from '@giro3d/giro3d/sources/WmsSource.js';
import ImageSource from '@giro3d/giro3d/sources/ImageSource'
// import { Layer, LayerEvents, LayerUserData } from '@giro3d/giro3d/core/layer'
import { PickObjectsAtOptions } from '@giro3d/giro3d/core/Instance'
import PickOptions from '@giro3d/giro3d/core/picking/PickOptions'
import Layer, { LayerEvents, LayerUserData, Target } from '@giro3d/giro3d/core/layer/Layer'
import { MapPickResult } from '@giro3d/giro3d/core/picking/PickTilesAt'
import ScreenSpaceError from '@giro3d/giro3d/core/ScreenSpaceError';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import LayeredMaterial from '@giro3d/giro3d/renderer/LayeredMaterial'

import VectorSource from '@giro3d/giro3d/sources/VectorSource';
import LayerUpdateState from '@giro3d/giro3d/core/layer/LayerUpdateState';
import OLUtils from '@giro3d/giro3d/utils/OpenLayersUtils';
import { InstanceEvents } from "@giro3d/giro3d/core/Instance";

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


}