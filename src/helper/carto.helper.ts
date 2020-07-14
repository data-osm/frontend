import {
  Map, GeoJSON, Style, Fill, VectorLayer, VectorImageLayer, VectorSource, RasterSource, ImageLayer
} from '../app/ol-module'

/**
 * Handle diverse operation in link with the map
 */

export class cartoHelper {

  map:Map

  constructor(map:Map){
    this.map = map
  }

  /**
   * Construct a shadow layer
   * @returns ImageLayer
   */
  constructShadowLayer(geojsonLayer:Object):ImageLayer{
    var worldGeojson = {
      "type": "FeatureCollection",
      "name": "world_shadow",
      "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },
      "features": [
      { "type": "Feature", "properties": { "id": 0 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -19824886.222640071064234, 19848653.805728208273649 ], [ 19467681.065475385636091, 19467681.065475385636091 ], [ 19753445.191207133233547, -15987945.626927629113197 ], [ -19824886.222640071064234, -15967070.525261469185352 ], [ -19824886.222640071064234, 19848653.805728208273649 ] ] ] } }
      ]
      }

    var featureToShadow= new GeoJSON().readFeatures(geojsonLayer, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    var featureWorld= new GeoJSON().readFeatures(worldGeojson);

    var rasterSource_world = new VectorImageLayer({
      source: new VectorSource(),
      projection: 'EPSG:3857',
      style: new Style({
        fill: new Fill({
          color: [0, 0, 0, 0.6]
        })
      })
    });

    var rasterSource_cmr = new VectorImageLayer({
      source: new VectorSource(),
      projection: 'EPSG:3857',
      style: new Style({
        fill: new Fill({
          color: [0, 0, 0, 0.1]
        })
      })
    });

    rasterSource_world.getSource().addFeatures(featureWorld)
    rasterSource_cmr.getSource().addFeatures(featureToShadow);

    var raster = new RasterSource({
      sources: [
        rasterSource_world,
        rasterSource_cmr
      ],
      operation: function (pixels, data) {
        if (pixels[1][3] == 0) {
          return pixels[0];
        } else {
          return [0, 0, 0, 1]
        }
      }
    });

    var rasterLayer = new ImageLayer({
      source: raster
    });

    return rasterLayer

  }
}
