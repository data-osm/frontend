import { Map, View, Feature } from 'ol';
import { getWidth, boundingExtent, getTopLeft, extend as MergeExtend, getCenter, equals as extentEquals } from 'ol/extent.js';
import TileLayer from 'ol/layer/Tile.js';
import { Group as LayerGroup, Vector as VectorLayer } from 'ol/layer.js';
import { transform as Transform, fromLonLat, get as getProjection, transformExtent, Projection } from 'ol/proj.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import VectorImageLayer from 'ol/layer/VectorImage';
import RasterSource from 'ol/source/Raster';
import TileImage from 'ol/source/TileImage'
import GeoJSON from 'ol/format/GeoJSON.js';
import { bbox as bboxStrategy } from 'ol/loadingstrategy.js';
import { Cluster, ImageStatic } from 'ol/source.js';
import VectorSource from 'ol/source/Vector.js';
import VectorSourceEvent from 'ol/source/Vector.js';
import {
  Circle as CircleStyle, Fill, Stroke, Text, RegularShape, Icon
} from 'ol/style.js';
import Style from 'ol/style/Style';
import Overlay from 'ol/Overlay.js';
import WFS from 'ol/format/WFS';
import { buffer, extend as Extent, createEmpty as createEmptyExtent } from 'ol/extent';
import Zoom from 'ol/control/Zoom';
import Rotate from 'ol/control/Rotate';
import { defaults as defaultControls, Attribution } from 'ol/control.js';
import LinearRing from 'ol/geom/LinearRing';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import GeometryCollection from 'ol/geom/GeometryCollection';
import Geometry from 'ol/geom/Geometry';
import { defaults as defaultInteractions, Modify, Select, Snap,Draw } from 'ol/interaction';
import { unByKey } from 'ol/Observable';
import Collection from 'ol/Collection';
import { singleClick, click } from 'ol/events/condition'
import XYZ from 'ol/source/XYZ';

// var jsts = require('jsts')
// var ol3Parser = new jsts.io.OL3Parser();
// ol3Parser.inject(Point, LineString,LinearRing,Polygon,MultiPoint, MultiLineString, MultiPolygon, GeometryCollection);

export {
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
  Projection,
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
  RasterSource
};
