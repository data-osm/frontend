import { Map, View, Feature } from 'ol';
import { getWidth, boundingExtent, getTopLeft, extend as MergeExtend, getCenter, equals as extentEquals } from 'ol/extent.js';
import TileLayer from 'ol/layer/Tile.js';
import { Group as LayerGroup, Vector as VectorLayer } from 'ol/layer.js';
import { transform as Transform, fromLonLat, get as getProjection, transformExtent, } from 'ol/proj.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import TileWMS from 'ol/source/TileWMS';
import VectorImageLayer from 'ol/layer/VectorImage';
import RasterSource from 'ol/source/Raster';

import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import GeoJSON from 'ol/format/GeoJSON.js';
import { bbox as bboxStrategy } from 'ol/loadingstrategy.js';
import { Cluster, ImageStatic } from 'ol/source.js';
import VectorSource from 'ol/source/Vector.js';
import { VectorSourceEvent } from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM';
import {
  Circle as CircleStyle, Fill, Stroke, Text, RegularShape, Icon
} from 'ol/style.js';
import Style from 'ol/style/Style';
import Overlay from 'ol/Overlay';
import WFS from 'ol/format/WFS';
import { buffer, extend as Extent, createEmpty as createEmptyExtent } from 'ol/extent';
import Zoom from 'ol/control/Zoom';
import Rotate from 'ol/control/Rotate';
import { defaults as defaultControls, Attribution, ScaleLine, MousePosition } from 'ol/control.js';
import { Coordinate, createStringXY } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import Circle from 'ol/geom/Circle';
import MultiPoint from 'ol/geom/MultiPoint';
import Polyline from 'ol/format/Polyline';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import GeometryCollection from 'ol/geom/GeometryCollection';
import Geometry, { GeometryLayout } from 'ol/geom/Geometry';
import { defaults as defaultInteractions, Modify, Select, Snap, Draw } from 'ol/interaction';
import { unByKey } from 'ol/Observable';
import Collection from 'ol/Collection';
import { singleClick, click } from 'ol/events/condition'
import XYZ from 'ol/source/XYZ';
import { getArea, getLength } from 'ol/sphere';
import { MapBrowserEvent } from 'ol'
import { Pixel } from 'ol/pixel';
import { FeatureLike } from 'ol/Feature';
import { PanOptions, Positioning } from 'ol/Overlay';
import VectorEventType from 'ol/source/VectorEventType.js';
import MVT from 'ol/format/MVT';
import TileState from "ol/TileState"
import { LinearRing } from "ol/geom";

const GeometryType = {
  POINT: Point,
  POLYGON: Polygon,
  LINE_STRING: LineString,
  MULTI_POLYGON: MultiPolygon,
  CIRCLE: Circle
}
const OverlayPositioning: { [key: string]: Positioning } = {
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_CENTER: "bottom-center",
  TOP_CENTER: "top-center"
}
// var jsts = require('jsts')
// var ol3Parser = new jsts.io.OL3Parser();
// ol3Parser.inject(Point, LineString,LinearRing,Polygon,MultiPoint, MultiLineString, MultiPolygon, GeometryCollection);
export {
  Coordinate,
  OverlayPositioning,
  FeatureLike,
  Pixel,
  MapBrowserEvent,
  fromLonLat,
  View,
  Map,
  VectorSource,
  GeoJSON,
  bboxStrategy,
  Cluster,
  VectorLayer,
  Style,
  Icon,
  CircleStyle,
  Stroke,
  Fill,
  Text,
  transformExtent,
  createEmptyExtent,
  Extent,
  Feature,
  ImageWMS,
  ImageLayer,
  Zoom,
  Rotate,
  Overlay,
  Point,
  TileLayer,
  Transform,
  Attribution, defaultControls,
  VectorSourceEvent,
  ImageStatic,
  getCenter,
  Polygon,
  LineString,
  defaultInteractions,
  Modify,
  Select,
  unByKey,
  Collection,
  boundingExtent,
  extentEquals,
  singleClick,
  click,
  LayerGroup,
  Snap,
  MultiPolygon,
  MultiLineString,
  XYZ,
  Geometry,
  Draw,
  VectorImageLayer,
  RasterSource,
  getArea,
  getLength,
  Circle,
  TileWMS,
  Polyline,
  ScaleLine,
  MousePosition,
  createStringXY,
  OSM,
  GeometryType,
  getProjection,
  VectorEventType,
  VectorTileLayer,
  VectorTileSource,
  MVT,
  TileState,
  GeometryLayout,
  LinearRing
};
