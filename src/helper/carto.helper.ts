import {
  Map, GeoJSON, Style, Fill, VectorLayer, VectorImageLayer, VectorSource, RasterSource, ImageLayer, ImageWMS, boundingExtent, Extent, transformExtent, Cluster, CircleStyle, Stroke, Text, Icon, TileLayer, XYZ, LayerGroup, TileWMS, Point, Feature
} from '../app/ol-module'
import * as $ from 'jquery'
import { BackendApiService } from 'src/app/services/backend-api/backend-api.service'
import { environment } from 'src/environments/environment'
import { map as portailMap } from 'src/app/map/map.component'
import { Injectable, Injector } from '@angular/core'
import { AppInjector } from 'src/helper/app-injector.helper'
import { manageDataHelper } from './manage-data.helper'
import { HttpErrorResponse } from '@angular/common/http'
import { from, timer } from 'rxjs'
import { retryWhen, tap, delay, take, delayWhen, retry, shareReplay } from 'rxjs/operators'

/**
 * interface that describe data get by a click on the map
 */
export interface dataFromClickOnMapInterface {
  type: 'vector' | 'raster' | 'clear',
  data: {
    coord: [number,number],
    layers: Array<any>,
    feature?: Feature
    /** additional data */
    data?: {}
  }
}

/**
 * Interface of the table of contents capabilities
 */
export interface tocCapabilitiesInterface {
  /**
       * change opactity
       */
  opacity: boolean,
  metadata: boolean,
  share: boolean
}
/**
 * Interface of the legend capabilities
 */
export interface legendCapabilitiesInterface {
  /**
   * url of the img icon
   */
  urlImg?: string
  /**
   * use legend from the carto server
   */
  useCartoServer?: boolean
}

/**
 * Interface of all layers in the map
 */
export interface layersInMap {
  nom: string
  type_layer: 'geosmCatalogue' | 'draw' | 'mesure' | 'mappilary' | 'exportData' | 'other' | 'routing',
  image: string
  properties: Object | null
  zIndex: number
  visible: boolean
  data: any,
  /**
   * text and background color of the badje in the table of contents
   */
  badge?: {
    text: string,
    bgColor: string
  }
  /**
   * The layer type OL/layer in the map
   */
  layer: any
  /**
 * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
 * By default, all is set to true
 */
  tocCapabilities: tocCapabilitiesInterface
  /**
   * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
   * by default this is none => no legend to display
   */
  legendCapabilities?: legendCapabilitiesInterface
  /**
   * description sheet capabilities
   */
  descriptionSheetCapabilities: 'osm'
}

const typeLayer = ['geosmCatalogue', 'draw', 'mesure', 'mappilary', 'exportData', 'other', 'routing']
/**
 * interface to construct  a layer
 */
export interface geosmLayer {
  'nom': string,
  /**
   * is the layer should appear in the toc ?
   */
  'inToc': boolean
  'type_layer': 'geosmCatalogue' | 'draw' | 'mesure' | 'mappilary' | 'exportData' | 'other' | 'routing',
  'type': 'geojson' | 'wfs' | 'wms' | 'xyz',
  'crs'?: string,
  'visible': boolean,
  'strategy'?: "bbox" | "all",
  'load'?: boolean,
  'style'?: any,
  'maxzoom'?: number,
  'minzoom'?: number,
  "zindex"?: number,
  "size"?: number,
  "cluster"?: boolean,
  "icon"?: string,
  "iconImagette"?: string,
  "url"?: string,
  "identifiant"?: string,
  /**
   * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
   * By default, all is set to true
   */
  tocCapabilities?: tocCapabilitiesInterface
  /**
   * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
   * by default this is none => no legend to display
   */
  legendCapabilities?: legendCapabilitiesInterface
  'properties': {
    group_id: number,
    couche_id: number,
    type: 'couche' | 'carte'
  } | null | Object
  descriptionSheetCapabilities: 'osm'
}


/**
 * Handle diverse operation in link with the map
 */
@Injectable()
export class cartoHelper {


  map: Map
  environment = environment
  BackendApiService: BackendApiService = AppInjector.get(BackendApiService);

  constructor(
    map?: Map,
  ) {

    if (map) {
      this.map = map
    } else {
      this.map = portailMap
    }

  }


  /**
   * Construct a shadow layer
   * @returns ImageLayer
   */
  constructShadowLayer(geojsonLayer: Object): ImageLayer {
    var worldGeojson = {
      "type": "FeatureCollection",
      "name": "world_shadow",
      "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },
      "features": [
        { "type": "Feature", "properties": { "id": 0 }, "geometry": { "type": "Polygon", "coordinates": [[[-19824886.222640071064234, 19848653.805728208273649], [19467681.065475385636091, 19467681.065475385636091], [19753445.191207133233547, -15987945.626927629113197], [-19824886.222640071064234, -15967070.525261469185352], [-19824886.222640071064234, 19848653.805728208273649]]] } }
      ]
    }

    var featureToShadow = new GeoJSON().readFeatures(geojsonLayer, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    var featureWorld = new GeoJSON().readFeatures(worldGeojson);

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
      source: raster,
      nom: 'map-shadow',
      /**
       * so that map.forEachLayerAtPixel work as expected
       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
       */
      className: 'map-shadow',

    });

    return rasterLayer

  }

  /**
     * Get all id from a layer source
     * @param source VectorSource
     * @return Array<string>
     */
  public static listIdFromSource(source: VectorSource): Array<string> {
    var response = []
    for (let index = 0; index < source.getFeatures().length; index++) {
      const feat = source.getFeatures()[index];
      response.push(feat.getId())
    }
    return response
  }

  /**
   * Get the current extent of the map
  */
  getCurrentMapExtent(): Extent {
    try {
      var coord_O_N = this.map.getCoordinateFromPixel([$('.mat-sidenav .sidenav-left').width(), $(window).height()])
      var coord_E_S = this.map.getCoordinateFromPixel([$(window).width(), 0])
      var extent_vieuw = boundingExtent([coord_O_N, coord_E_S])
      return extent_vieuw
    } catch (error) {
      var extent_vieuw = this.map.getView().calculateExtent()
      return extent_vieuw
    }
  }



  /**
   * Construct a layer with openlayers
   * @param couche geosmLayer the layer to construct
   * @return VectorLayer|ImageLayer the layer costructed
   */
  constructLayer(couche: geosmLayer) {
    if (couche.type == "xyz") {
      var layer = new TileLayer({
        source: new XYZ({
          url: couche.url
        }),
        /**
      * so that map.forEachLayerAtPixel work as expected
      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
      */
        className: couche.nom + '___' + couche.type_layer
      })
    } else if (couche.type == "wms") {

      var wmsSource = new TileWMS({
        url: couche.url,
        params: { 'LAYERS': couche.identifiant, 'TILED': true },
        serverType: 'qgis',
        crossOrigin: 'anonymous',
      });

      var layer = new TileLayer({
        source: wmsSource,
        /**
       * so that map.forEachLayerAtPixel work as expected
       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
       */
        className: couche.nom + '___' + couche.type_layer
      });
    } else if (couche.type == "geojson") {
      var vectorSource = new VectorSource({
        format: new GeoJSON(),
      })

      var layer = new layer({
        source: vectorSource,
        style: couche.style,
        /**
      * so that map.forEachLayerAtPixel work as expected
      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
      */
        className: couche.nom + '___' + couche.type_layer
      })

      if (couche.cluster) {
        var clusterSource = new Cluster({
          distance: 80,
          source: vectorSource
        });
        var styleCache = {};
        var styleCacheCopy = {}
        var layer = new VectorLayer({
          source: clusterSource,
          style: (feature) => {
            var size = feature.get('features').length;

            if (size > 1) {

              var styleDefault = styleCache[size];
              if (!styleDefault) {
                var radius = 10
                if (size > 99) {
                  radius = 12, 5
                }
                styleDefault = new Style({

                  image: new CircleStyle({
                    radius: radius,

                    stroke: new Stroke({
                      color: '#fff',
                      width: 2
                    }),
                    fill: new Fill({
                      color: environment.primaryColor,
                    })
                  }),
                  text: new Text({
                    text: size.toString(),
                    fill: new Fill({
                      color: '#fff'
                    }),
                    font: '12px sans-serif',
                    offsetY: 1,
                    offsetX: -0.5
                  })
                });
                styleCache[size] = styleDefault;
              }

              return [couche.style, styleDefault];

            } else if (size == 1) {
              return new Style({
                image: new Icon({
                  scale: couche.size,
                  src: couche.icon
                })
              })

            } else if (size == 0) {
              return
            }

          },
          /**
          * so that map.forEachLayerAtPixel work as expected
          * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
          */
          className: couche.nom + '___' + couche.type_layer
        });

      }


    } else if (couche.type == 'wfs') {
      var source = new VectorSource({
        format: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }),
        loader: (extent, resolution, projection) => {
          var extent_vieuw = this.getCurrentMapExtent()
          var url = couche.url +
            '?bbox=' + transformExtent(extent_vieuw, 'EPSG:3857', 'EPSG:4326').join(',') +
            '&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=' + couche.identifiant;
          this.BackendApiService.getRequestFromOtherHostObserver(url)
          .pipe(
            /** retry 3 times after 2s if querry failed  */
            retryWhen(errors=>
              errors.pipe(
                tap((val:HttpErrorResponse) => {
                  // console.log(val)
                }),
                delayWhen((val:HttpErrorResponse) => timer(2000)),
                // delay(2000),
                take(3)
              )
            )
          )
          .subscribe(
            (data)=>{
              source.addFeatures(source.getFormat().readFeatures(data));
              for (let index = 0; index < source.getFeatures().length; index++) {
                const feature = source.getFeatures()[index];
                feature.set('featureId',feature.getId())
              }
            },
            (err:HttpErrorResponse) => {
              source.removeLoadedExtent(extent_vieuw);
            }
          )

        }
      });

      var layer = new VectorLayer({
        source: source,
        style: new Style({
          image: new Icon({
            scale: couche.size,
            src: couche.icon
          })
        }),
        /**
      * so that map.forEachLayerAtPixel work as expected
      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
      */
        className: couche.nom + '___' + couche.type_layer
      });

      if (couche.cluster) {
        var clusterSource = new Cluster({
          distance: 80,
          source: source
        });
        var styleCache = {};
        var styleCacheCopy = {}
        var layer = new VectorLayer({
          source: clusterSource,
          style: (feature) => {
            var size = feature.get('features').length;

            if (size > 1) {

              var styleDefault = styleCache[size];
              if (!styleDefault) {
                var radius = 10
                if (size > 99) {
                  radius = 12, 5
                }
                styleDefault = new Style({

                  image: new CircleStyle({
                    radius: radius,

                    stroke: new Stroke({
                      color: '#fff',
                      width: 2
                    }),
                    fill: new Fill({
                      color: environment.primaryColor,
                    })
                  }),
                  text: new Text({
                    text: size.toString(),
                    fill: new Fill({
                      color: '#fff'
                    }),
                    font: '12px sans-serif',
                    offsetY: 1,
                    offsetX: -0.5
                  })
                });
                styleCache[size] = styleDefault;
              }

              return [new Style({
                image: new Icon({
                  scale: couche.size,
                  src: couche.icon
                })
              }), styleDefault];

            } else if (size == 1) {
              return new Style({
                image: new Icon({
                  scale: couche.size,
                  src: couche.icon
                })
              })

            } else if (size == 0) {
              return
            }

          },
          /**
      * so that map.forEachLayerAtPixel work as expected
      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
      */
          className: couche.nom + '___' + couche.type_layer
        });

      }


    }

    layer.set('properties', couche.properties)
    layer.set('nom', couche.nom)
    layer.set('type_layer', couche.type_layer)
    layer.set('iconImagette', couche.iconImagette)
    layer.set('identifiant', couche.identifiant)
    layer.set('inToc', couche.inToc)
    layer.set('tocCapabilities', couche.tocCapabilities)
    layer.set('legendCapabilities', couche.legendCapabilities)
    layer.set('descriptionSheetCapabilities', couche.descriptionSheetCapabilities)

    if (couche.zindex) {
      layer.setZIndex(couche.zindex)
    }

    if (couche.minzoom) {
      layer.setminResolution(this.map.getView().getResolutionForZoom(couche.minzoom))
    }

    if (couche.maxzoom) {
      layer.setmaxResolution(this.map.getView().getResolutionForZoom(couche.maxzoom))
    }

    layer.setVisible(couche.visible)

    return layer

  }

  /**
   * Add any type of layer in the map
   * @param layer layer to add
   * @param group string name of layerGroup where we want to add the layer.
   */
  addLayerToMap(layer: VectorLayer | ImageLayer, group: string = 'principal') {
    if (!layer.get('nom')) {
      throw new Error("Layer must have a 'nom' properties");
    }

    if (!layer.get('type_layer')) {
      throw new Error("Layer must have a 'type_layer' properties");
    }

    if (typeLayer.indexOf(layer.get('type_layer')) == -1) {
      throw new Error("Layer must have a 'type_layer' properties among " + typeLayer.join(','));
    }

    var zIndex = this.getMaxZindexInMap() + 1

    if (layer.get('nom') && layer.get('type_layer')) {

      if (!layer.getZIndex()) {
        layer.setZIndex(zIndex)
      }

      // var groupLayer = this.getLayerGroupByNom(group)

      this.map.addLayer(layer)
      this.map.renderSync()
      // console.log(groupLayer)
      // groupLayer.getLayers().getArray().push(layer)

    }

  }

  /**
   *Get group layer by nom
   * @param groupName
   */
  getLayerGroupByNom(groupName: string): LayerGroup {
    var groupLayer = undefined
    this.map.getLayers().forEach((group) => {
      if (group instanceof LayerGroup) {

        if (group.get('nom') == groupName) {
          groupLayer = group
        }
      }
    });
    return groupLayer
  }

  /**
   * Get all layer in map
   */
  getAllLAyerInMap(): Array<any> {
    var responseLayers = []
    this.map.getLayers().forEach((group) => {
      if (group instanceof LayerGroup) {
        responseLayers = responseLayers.concat(group.getLayers().getArray())
      } else {
        responseLayers.push(group)
      }
    });
    return responseLayers
  }

  /**
   * Remove any type of layer in the map
   */
  removeLayerToMap(layer: VectorLayer | ImageLayer) {
    this.map.removeLayer(layer)
  }

  /**
   * Make a layer invisible in th map
   * @param layer
   */
  setLayerInvisible(layer: VectorLayer | ImageLayer) {
    layer.setVisible(false)
  }

  /**
   * Make a layer visible in th map
   * @param layer
   */
  setLayerVisible(layer: VectorLayer | ImageLayer) {
    layer.setVisible(true)
  }

  /**
   * Get list of layer by thier names
   * @param name string 'nom' of layer to search
   * @param isLayerGroup boolean is the layeys we want are in a layergroup ?
   * @return Array<any>
   */
  getLayerByName(name: string, isLayerGroup: boolean = false): Array<any> {
    var layer_to_remove = []

    if (isLayerGroup) {
      var all_layers = this.map.getLayers().getArray()
    } else {
      var all_layers = this.map.getLayerGroup().getLayers().getArray()
    }

    for (let index = 0; index < all_layers.length; index++) {
      var layer = all_layers[index]
      if (layer.get('nom') == name) {
        layer_to_remove.push(layer)
      }

    }
    return layer_to_remove
  }

  /**
   * Get list of layer by thier names
   * @param properties Object properties of layer to search
   * @param isLayerGroup boolean is the layeys we want are in a layergroup ?
   * @return Array<any>
   */
  getLayerByProperties(properties: Object, isLayerGroup: boolean = false): Array<any> {
    var layer_to_remove = []

    if (isLayerGroup) {
      var all_layers = this.map.getLayers().getArray()
    } else {
      var all_layers = this.map.getLayerGroup().getLayers().getArray()
    }

    for (let index = 0; index < all_layers.length; index++) {
      var layer = all_layers[index]
      var correspondanceLenght = 0

      for (const key in properties) {
        if (properties.hasOwnProperty(key) && layer.get('properties') && layer.get('properties')[key] != undefined) {
          const element = properties[key];
          if (properties[key] == layer.get('properties')[key]) {
            correspondanceLenght = correspondanceLenght + 1
          }
        }
      }

      if (Object.keys(properties).length == correspondanceLenght) {
        layer_to_remove.push(layer)
      }

    }

    return layer_to_remove

  }

  /**
   * Get list of layer by properties of geosm catalogue
   * @param properties {group_id: number,couche_id: number,type:'couche'|'carte'} properties geosm catalogue of layer to search
   * @param isLayerGroup boolean is the layeys we want are in a layergroup ?
   * @return Array<any>
   */
  getLayerByPropertiesCatalogueGeosm(properties: { group_id: number, couche_id: number, type: 'couche' | 'carte' }): Array<any> {
    var layer_to_remove = []
    var all_layers = this.getAllLAyerInMap()
    for (let index = 0; index < all_layers.length; index++) {
      var layer = all_layers[index]
      if (layer.get('properties')) {
        if (layer.get('properties')['type'] == properties.type && layer.get('properties')['group_id'] == properties.group_id && layer.get('properties')['couche_id'] == properties.couche_id) {
          layer_to_remove.push(layer)
        }
      }
    }

    return layer_to_remove
  }

  /**
   * Get all layers in the TOC.
   * Remark : all layer not in group group-layer-shadow
   * @return Array<layersInMap>
   */
  getAllLayersInToc(): Array<layersInMap> {
    var reponseLayers: Array<layersInMap> = []
    var allLayers = this.map.getLayers().getArray()

    for (let index = 0; index < allLayers.length; index++) {
      const layer = allLayers[index];
      if (layer.get('inToc')) {
        reponseLayers.push(this.constructAlyerInMap(layer))
      }
    }

    return reponseLayers
  }

  /**
   * construct a layersInMap Object fron a layer in the map
   * @param layer any
   * @return layersInMap
   */
  constructAlyerInMap(layer: any): layersInMap {
    var data = null
    var tocCapabilities: tocCapabilitiesInterface = {} as tocCapabilitiesInterface
    if (layer.get('tocCapabilities')) {
      tocCapabilities.opacity = layer.get('tocCapabilities')['opacity'] != undefined ? layer.get('tocCapabilities')['opacity'] : true
      tocCapabilities.share = layer.get('tocCapabilities')['share'] != undefined ? layer.get('tocCapabilities')['share'] : true
      tocCapabilities.metadata = layer.get('tocCapabilities')['metadata'] != undefined ? layer.get('tocCapabilities')['metadata'] : true
    } else {
      tocCapabilities.opacity = true
      tocCapabilities.share = true
      tocCapabilities.metadata = true
    }

    return {
      tocCapabilities: tocCapabilities,
      legendCapabilities: layer.get('legendCapabilities'),
      nom: layer.get('nom'),
      type_layer: layer.get('type_layer'),
      properties: layer.get('properties'),
      image: layer.get('iconImagette'),
      data: data,
      zIndex: layer.getZIndex(),
      visible: layer.getVisible(),
      layer: layer,
      descriptionSheetCapabilities: layer.get('descriptionSheetCapabilities')
    }
  }

  /**
   * Edit the zIndex of a layer:
   * Will set the Zindex of the layer and
   * - reduce by one all layer that Zindex are < this layer
   * - increase by one all layer that zIndex are > this layer
   * @param layer any layer to edit zindex
   * @param zIndex number
   */
  editZindexOfLayer(layer: any, zIndex: number) {
    for (let index = 0; index < this.getAllLayersInToc().length; index++) {
      const layerInmap = this.getAllLayersInToc()[index].layer;

      console.log(layer.getZIndex(), zIndex)
      if (layer.getZIndex() < zIndex) {
        // if the layer is going up
        if (layerInmap.getZIndex() <= zIndex) {
          layerInmap.setZIndex(layerInmap.getZIndex() - 1)
        } else if (layerInmap.getZIndex() > zIndex) {
          layerInmap.setZIndex(layerInmap.getZIndex() + 1)
        }
      } else if (layer.getZIndex() > zIndex) {
        // if the layer is going down
        if (layerInmap.getZIndex() >= zIndex) {
          layerInmap.setZIndex(layerInmap.getZIndex() + 1)
        } else if (layerInmap.getZIndex() < zIndex) {
          layerInmap.setZIndex(layerInmap.getZIndex() - 1)
        }
      }
    }

    layer.setZIndex(zIndex)
  }

  /**
   * Get max z index of map layers that are in the TOC
   * @return number
   */
  getMaxZindexInMap(): number {
    var allLayers = this.map.getLayers().getArray()

    var allZindex = [0]
    for (let index = 0; index < allLayers.length; index++) {
      var layer = allLayers[index]
      if (layer instanceof LayerGroup) {
      } else {
        try {
          if (layer.get('inToc')) {
            allZindex.push(layer.getZIndex())
          }

          // console.log(layer.get('nom'),layer.getZIndex())
        } catch (error) {
          console.error(error)
        }
      }

    }
    return Math.max(...allZindex)
  }


  /**
   * Detect all layers of type WMS (ImageLayer or TileLayer) on a pixel
   * We can also rempve layers that have certains values (oddLayersValues) for attributes (oddLayersAttr)
   * @param number[] pixel
   * @param string oddLayersAttr
   * @param Array<string> oddLayersValues
   * @returns Array<ImageLayer>
   */
  displayFeatureInfo(pixel: number[], oddLayersAttr: string, oddLayersValues: Array<string>): Array<any> {
    var layers = []
    this.map.forEachLayerAtPixel(pixel,
      function (layer, rgb: Uint8ClampedArray) {

        if (layer) {

          if (layer.getSource() instanceof TileWMS && oddLayersValues.indexOf(layer.get(oddLayersAttr)) == -1) {
            layers.push(layer)
          }
        }

      });

    return layers;
  }


  /**
    *click sur la carte
    *@param evt
    *@param (param :dataFromClickOnMapInterface)=>void
    */
  mapHasCliked(evt, callback: (param: dataFromClickOnMapInterface) => void) {
    var pixel = this.map.getEventPixel(evt.originalEvent);

    var feature = this.map.forEachFeatureAtPixel(pixel,
      function (feature, layer) {
        return feature;
      }, {
      hitTolerance: 5
    });

    var layer = this.map.forEachFeatureAtPixel(pixel,
      function (feature, layer) {
        if (layer instanceof VectorLayer) {
          return layer;
        }

      }, {
      hitTolerance: 5
    });

    var layers = []

    if (!feature) {
      var all_pixels = new manageDataHelper().calcHitMatrix(evt.pixel)
      for (let index = 0; index < all_pixels.length; index++) {
        var un_pixel = all_pixels[index];
        var nom_layers_load = []

        for (let i = 0; i < layers.length; i++) {
          nom_layers_load.push(layers[i].get('nom'));
        }

        var layers_in_pixels = this.displayFeatureInfo(un_pixel, 'nom', nom_layers_load)

        for (let j = 0; j < layers_in_pixels.length; j++) {
          layers.push(layers_in_pixels[j]);
        }

      }
    }


    if (layer instanceof VectorLayer && feature) {
      /**
       * if the user click on a cluser, and the cluster have more than one feature, we zoom in; but if ther is only one feature, we return the feature
       *
      */

      if (layer.getSource() instanceof Cluster) {
        var numberOfFeatureInCluster = this.countFeaturesInCluster(feature.get('features'));
        // console.log(layer,feature,numberOfFeatureInCluster)
        if (numberOfFeatureInCluster > 1) {
          if (Object.create(feature.getGeometry()).getType() == 'Point') {
            var coordinate = Object.create(feature.getGeometry()).getCoordinates();
            var geom = new Point(coordinate)
            this.fit_view(geom, this.map.getView().getZoom() + 2)
          }
        } else if (numberOfFeatureInCluster == 1) {
          var feat = this.getFeatureThatIsDisplayInCulster(feature.getProperties().features)
          var coord = this.map.getCoordinateFromPixel(pixel)
          var data_callback: dataFromClickOnMapInterface = {
            type: 'vector',
            data: {
              coord: coord,
              layers: [layer],
              feature: feat,
              data: {}
            }
          }

          callback(data_callback)
        }

      }

      // var coord = this.map.getCoordinateFromPixel(pixel)
      // var data_callback: dataFromClickOnMapInterface = {
      //   'type': 'clear_elem_geo_surbrillance',
      //   data: {
      //     coord: coord,
      //     layers: layers
      //   }
      // }
      // callback(data_callback)

    } else if (layers.length > 0) {
      var coord = this.map.getCoordinateFromPixel(pixel)
      var data_callback: dataFromClickOnMapInterface = {
        type: 'raster',
        data: {
          coord: coord,
          layers: layers
        }
      }
      callback(data_callback)

    } else {
      var coord = this.map.getCoordinateFromPixel(pixel)
      var data_callback: dataFromClickOnMapInterface = {
        'type': 'clear',
        data: {
          coord: coord,
          layers: layers
        }
      }
      callback(data_callback)
    }
  }

  /**
   * Count features in a cluster
   * @param features Feature
   * @return number
   */
  countFeaturesInCluster(features): number {
    var size = 0;
    for (let index = 0; index < features.length; index++) {
      const feat = features[index];
      // if (feat.get('display') == true) {
      size = size + 1
      // }
    }

    return size
  }

  /**
   * Get feature that is display in a cluster
   * @param Array<Feature> features
   * @retun Feature
   */
  getFeatureThatIsDisplayInCulster(features: Array<Feature>): Feature {
    var feature
    for (let index = 0; index < features.length; index++) {
      const feat = features[index];
      // if (feat.get('display') == true) {
      feature = feat
      // }
    }
    return feature
  }


  /**
    * Récuperer les informations d'un feature wms
    * @param WMTS source
    * @param Array<number> coordinates  coodonnées
    */
  getFeatureInfoFromWmsSource(source: ImageWMS, coordinates: Array<number>) {
    var viewResolution = this.map.getView().getResolution();
    var url = source.getFeatureInfoUrl(coordinates, viewResolution, 'EPSG:3857') + "&WITH_GEOMETRY=true&INFO_FORMAT=application/json&FI_LINE_TOLERANCE=17&FI_POLYGON_TOLERANCE=17&FI_POINT_TOLERANCE=17"
    return url
  }

  fit_view(geom, zoom, padding?) {
    // if (padding == undefined) {
    //   padding = this.get_padding_map()
    // }
    // this.map.getView().animate({zoom: zoom}, {center: geom.getCoordinates()});

    // console.log([this.map.getSize()[0]- $('.sidenav-left').width() , this.map.getSize()[1] ])
    this.map.getView().fit(geom, {
      'maxZoom': zoom,
      'size':this.map.getSize(),
      'padding': [0, 0, 0, 0],
      'duration': 500
    })

  }

}
