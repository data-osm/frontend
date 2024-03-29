import {
  Map, GeoJSON, Style, Fill, VectorLayer, VectorImageLayer, VectorSource, RasterSource, ImageLayer, ImageWMS, boundingExtent, Extent, transformExtent, Cluster, CircleStyle, Stroke, Text, Icon, TileLayer, XYZ, LayerGroup, TileWMS, Point, Feature
  , ScaleLine,
  MousePosition,
  createStringXY,
  MapBrowserEvent,
  Geometry
} from '../app/ol-module'
import * as $ from 'jquery'
import { BackendApiService } from '../app/services/backend-api/backend-api.service'
import { environment } from '../environments/environment'
import { Injectable, Injector } from '@angular/core'
import { AppInjector } from '../helper/app-injector.helper'
import { manageDataHelper } from './manage-data.helper'
import { HttpErrorResponse } from '@angular/common/http'
import { from, timer } from 'rxjs'
import { retryWhen, tap, delay, take, delayWhen, retry, shareReplay } from 'rxjs/operators'
import Geolocation from 'ol/Geolocation';
import { Coordinate } from 'ol/coordinate'
import BaseLayer from 'ol/layer/Base'
/**
 * interface that describe data get by a click on the map
 */
export interface dataFromClickOnMapInterface {
  type: 'vector' | 'raster' | 'clear',
  data: {
    coord: Coordinate,
    layers: Array<ImageLayer | TileLayer | VectorLayer>,
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
       * Can change opactity ?
       */
  opacity: boolean,
  /**
   * have metadata ?
   */
  metadata: boolean,
  /**
   * Can be shared ?
   */
  share: boolean
  /**
   * Can be automatically remove when the user wnant to clear the map ?
   */
  removable: boolean
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
  description: string
}

/**
 * Interface of all layers in the map
 */
export interface layersInMap {
  nom: string
  type_layer: 'geosmCatalogue' | 'draw' | 'mesure' | 'mappilary' | 'exportData' | 'other' | 'routing',
  image: string
  properties: {
    type: 'couche' | 'carte',
    couche_id: number
    [key: string]: any
  }
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
  layer: Array<BaseLayer>
  /**
 * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
 * By default, all is set to true
 */
  tocCapabilities: tocCapabilitiesInterface
  /**
   * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
   * by default this is none => no legend to display
   */
  legendCapabilities?: legendCapabilitiesInterface[]
  /**
   * description sheet capabilities
   */
  descriptionSheetCapabilities: 'osm'
}

const typeLayer = ['geosmCatalogue', 'draw', 'mesure', 'mappilary', 'exportData', 'other', 'routing']
/**
 * interface to construct  a layer
 */
export interface DataOSMLayer {
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
  "identifiant"?: string[],
  "styleWMS"?: string[],
  /**
   * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
   * By default, all is set to true
   */
  tocCapabilities: tocCapabilitiesInterface
  /**
   * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
   * by default this is none => no legend to display
   */
  legendCapabilities?: legendCapabilitiesInterface[]
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
export class CartoHelper {

  environment = environment
  BackendApiService: BackendApiService = AppInjector.get(BackendApiService);

  constructor(
    public map: Map,
  ) {

  }


  /**
   * Construct a shadow layer
   * @returns ImageLayer
   */
  constructShadowLayer(featureToShadow: Feature<Geometry>[]): ImageLayer {
    var worldGeojson = {
      "type": "FeatureCollection",
      "name": "world_shadow",
      "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },
      "features": [
        { "type": "Feature", "properties": { "id": 0 }, "geometry": { "type": "Polygon", "coordinates": [[[-19824886.222640071064234, 19848653.805728208273649], [19467681.065475385636091, 19467681.065475385636091], [19753445.191207133233547, -15987945.626927629113197], [-19824886.222640071064234, -15967070.525261469185352], [-19824886.222640071064234, 19848653.805728208273649]]] } }
      ]
    }

    // var featureToShadow = new GeoJSON().readFeatures(geojsonLayer, {
    //   dataProjection: 'EPSG:4326',
    //   featureProjection: 'EPSG:3857'
    // });

    var featureWorld = new GeoJSON().readFeatures(worldGeojson);

    var rasterSource_world = new VectorImageLayer({
      source: new VectorSource({
        features: featureWorld
      }),
      // projection: 'EPSG:3857',
      style: new Style({
        fill: new Fill({
          color: [0, 0, 0, 0.6]
        })
      })
    });

    var rasterSource_cmr = new VectorImageLayer({
      source: new VectorSource({
        features: featureToShadow
      }),
      // projection: 'EPSG:3857',
      style: new Style({
        fill: new Fill({
          color: [0, 0, 0, 0.1]
        })
      })
    });


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
      /**
       * so that map.forEachLayerAtPixel work as expected
       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
       */
      className: 'map-shadow',

    });
    rasterLayer.set('nom', 'map-shadow')

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
  getCurrentMapExtent() {
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
  constructLayer(couche: DataOSMLayer): TileLayer | LayerGroup | VectorLayer {
    let layer: TileLayer | LayerGroup | VectorLayer;

    if (couche.type == "xyz") {
      layer = new TileLayer({
        source: new XYZ({
          url: couche.url,
          attributions: '<a target="_blank" href="https://www.openstreetmap.org/copyright"> © OpenStreetMap </a> contributors , develop by <a target="_blank" href="https://twitter.com/armeltayou"> @armeltayou </a>',
        }),
        /**
      * so that map.forEachLayerAtPixel work as expected
      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
      */
        className: couche.nom + '___' + couche.type_layer
      })
    } else if (couche.type == "wms") {
      let params: { [key: string]: any; } = {
        'LAYERS': couche.identifiant.join(','),
        'TILED': true
      }
      if (couche.styleWMS && couche.styleWMS.length > 0) {
        params['STYLE'] = couche.styleWMS.join(',')
      }
      var wmsSourceTile = new TileWMS({
        url: couche.url,
        params: params,
        serverType: 'qgis',
        crossOrigin: 'anonymous',
      });

      var layerTile = new TileLayer({
        source: wmsSourceTile,
        /**
       * so that map.forEachLayerAtPixel work as expected
       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
       */
        className: couche.nom + '___' + couche.type_layer,
        minResolution: this.map.getView().getResolutionForZoom(9)
      });

      var wmsSourceImage = new ImageWMS({
        url: couche.url,
        params: params,
        serverType: 'qgis',
        crossOrigin: 'anonymous',
      });

      var layerImage = new ImageLayer({
        source: wmsSourceImage,
        /**
       * so that map.forEachLayerAtPixel work as expected
       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
       */
        className: couche.nom + '___' + couche.type_layer,
        maxResolution: this.map.getView().getResolutionForZoom(9),
      });

      layer = new LayerGroup({
        layers: [
          layerTile,
          layerImage
        ]
      })

    } else if (couche.type == "geojson") {
      var vectorSource = new VectorSource({
        format: new GeoJSON(),
      })

      layer = new VectorLayer({
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
        layer = new VectorLayer({
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
            '&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=' + couche.identifiant.join(',');
          this.BackendApiService.getRequestFromOtherHostObserver(url)
            .pipe(
              /** retry 3 times after 2s if querry failed  */
              retryWhen(errors =>
                errors.pipe(
                  tap((val: HttpErrorResponse) => {
                    // console.log(val)
                  }),
                  delayWhen((val: HttpErrorResponse) => timer(2000)),
                  // delay(2000),
                  take(3)
                )
              )
            )
            .subscribe(
              (data) => {
                let features: any = source.getFormat().readFeatures(data)

                source.addFeatures(features);
                for (let index = 0; index < source.getFeatures().length; index++) {
                  const feature = source.getFeatures()[index];
                  feature.set('featureId', feature.getId())
                }
              },
              (err: HttpErrorResponse) => {
                source.removeLoadedExtent(extent_vieuw);
              }
            )

        }
      });

      layer = new VectorLayer({
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
        layer = new VectorLayer({
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

    this.setPropertiesToLayer(layer, couche)

    if (couche.zindex) {
      this.setZindexToLayer(layer, couche.zindex)
    }

    if (couche.minzoom && layer instanceof TileLayer == false) {
      layer.setMinResolution(this.map.getView().getResolutionForZoom(couche.minzoom))
    }

    if (couche.maxzoom) {
      layer.setMaxResolution(this.map.getView().getResolutionForZoom(couche.maxzoom))

    }

    layer.setVisible(couche.visible)

    return layer

  }

  /**
   * Set properties to a layer
   * @param layer
   * @param couche
   */
  setPropertiesToLayer(layer: any, couche: DataOSMLayer) {
    if (layer instanceof LayerGroup) {
      for (let index = 0; index < layer.getLayers().getArray().length; index++) {
        const element = layer.getLayers().getArray()[index];
        element.set('properties', couche.properties)
        element.set('nom', couche.nom)
        element.set('type_layer', couche.type_layer)
        element.set('iconImagette', couche.iconImagette)
        element.set('identifiant', couche.identifiant ? couche.identifiant.join(',') : undefined)
        element.set('inToc', couche.inToc)
        element.set('tocCapabilities', couche.tocCapabilities)
        element.set('legendCapabilities', couche.legendCapabilities)
        element.set('descriptionSheetCapabilities', couche.descriptionSheetCapabilities)
      }
    }

    layer.set('properties', couche.properties)
    layer.set('nom', couche.nom)
    layer.set('type_layer', couche.type_layer)
    layer.set('iconImagette', couche.iconImagette)
    layer.set('identifiant', couche.identifiant ? couche.identifiant.join(',') : undefined)
    layer.set('inToc', couche.inToc)
    layer.set('tocCapabilities', couche.tocCapabilities)
    layer.set('legendCapabilities', couche.legendCapabilities)
    layer.set('descriptionSheetCapabilities', couche.descriptionSheetCapabilities)

  }

  /**
   * Add any type of layer in the map
   * @param layer layer to add
   * @param group string name of layerGroup where we want to add the layer.
   */
  addLayerToMap(layer: TileLayer | LayerGroup | VectorLayer, group: string = 'principal') {
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
        this.setZindexToLayer(layer, zIndex)
      }

      // var groupLayer = this.getLayerGroupByNom(group)

      this.map.addLayer(layer)
      // this.map.renderSync()
      // console.log(groupLayer)
      // groupLayer.getLayers().getArray().push(layer)

    }

  }
  /**
   * set zIndex to a layer
   * @param layer any any type of layer
   * @param zIndex
   */
  setZindexToLayer(layer: any, zIndex: number) {
    layer.setZIndex(zIndex)
    if (layer instanceof LayerGroup) {
      for (let index = 0; index < layer.getLayers().getArray().length; index++) {
        layer.getLayers().getArray()[index].setZIndex(zIndex);
      }
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
  getAllLAyerInMap(): Array<BaseLayer> {
    var responseLayers = []
    this.map.getLayers().forEach((group) => {
      responseLayers.push(group)
    });
    return responseLayers
  }

  /**
   * Remove any type of layer in the map
   */
  removeLayerToMap(layer: BaseLayer) {
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
  getLayerByPropertiesCatalogueGeosm(properties: { group_id?: number, couche_id: number, type: 'couche' | 'carte' }): Array<BaseLayer> {

    return this.getAllLAyerInMap()
      .filter((layer) => layer.get('properties') != undefined)
      .filter((layer) => {
        if (properties.group_id) {
          return layer.get('properties')['type'] == properties.type && layer.get('properties')['group_id'] == properties.group_id && layer.get('properties')['couche_id'] == properties.couche_id
        } else {
          return layer.get('properties')['type'] == properties.type && layer.get('properties')['couche_id'] == properties.couche_id
        }
      })

  }

  /**
   * Get all layers in the TOC.
   * Remark : all layer not in group call "group-layer-shadow"
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

    let cloneAllLayers = [...reponseLayers]
    let duplicates: Array<layersInMap> = []
    let duplicatesGrouped: Array<layersInMap> = []
    function flatDeep(arr) {
      return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val), []);
   };
    let layerOfSameGroup = cloneAllLayers.find((nnn, index) =>{
      return cloneAllLayers.find((x, ind)=> x.properties.couche_id+x.properties['type'] === nnn.properties.couche_id+nnn.properties['type'] && index !== ind )
    })
    while (layerOfSameGroup) {
      let allInstanceDuplicates = reponseLayers.filter((t)=> t.properties.couche_id+t.properties['type'] === layerOfSameGroup.properties.couche_id+layerOfSameGroup.properties['type'] )
      allInstanceDuplicates.map((t)=> duplicates.push(t) )
      let allLayersDuplicate:Array<BaseLayer> =flatDeep(allInstanceDuplicates.map((h)=>h.layer))
      let clone = {...layerOfSameGroup}
      clone.layer = allLayersDuplicate
      duplicatesGrouped.push(clone)

      let duplicatesKey = duplicates.map((y)=>y.properties.couche_id+y.properties['type'])
      cloneAllLayers = cloneAllLayers.filter((g)=> !duplicatesKey.includes(g.properties.couche_id+g.properties['type']) )

      layerOfSameGroup = cloneAllLayers.find((nnn, index) =>{
        return cloneAllLayers.find((x, ind)=> x.properties.couche_id+x.properties['type'] === nnn.properties.couche_id+nnn.properties['type'] && index !== ind )
      })
    }

    duplicatesGrouped.map((ll)=>cloneAllLayers.push(ll))
    return cloneAllLayers
  }

  /**
   * construct a layersInMap Object fron a layer in the map
   * @param layer BaseLayer
   * @return layersInMap
   */
  constructAlyerInMap(layer: BaseLayer): layersInMap {
    // var data = null
    // var tocCapabilities: tocCapabilitiesInterface = {} as tocCapabilitiesInterface
    // if (layer.get('tocCapabilities')) {
    //   tocCapabilities.opacity = layer.get('tocCapabilities')['opacity'] != undefined ? layer.get('tocCapabilities')['opacity'] : true
    //   tocCapabilities.share = layer.get('tocCapabilities')['share'] != undefined ? layer.get('tocCapabilities')['share'] : true
    //   tocCapabilities.metadata = layer.get('tocCapabilities')['metadata'] != undefined ? layer.get('tocCapabilities')['metadata'] : true
    // } else {
    //   tocCapabilities.opacity = true
    //   tocCapabilities.share = true
    //   tocCapabilities.metadata = true
    // }

    return {
      tocCapabilities: layer.get('tocCapabilities'),
      legendCapabilities: layer.get('legendCapabilities'),
      nom: layer.get('nom'),
      type_layer: layer.get('type_layer'),
      properties: layer.get('properties'),
      image: layer.get('iconImagette'),
      data: null,
      zIndex: layer.getZIndex(),
      visible: layer.getVisible(),
      layer: [layer],
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
  editZindexOfLayer(layer: BaseLayer, zIndex: number) {
    for (let index = 0; index < this.getAllLayersInToc().length; index++) {
      // const layerInmap = this.getAllLayersInToc()[index].layer;
      this.getAllLayersInToc()[index].layer.map((layerInmap) => {
        if (layer.getZIndex() < zIndex) {
          // if the layer is going up
          if (layerInmap.getZIndex() <= zIndex) {
            this.setZindexToLayer(layerInmap, layerInmap.getZIndex() - 1)
          } else if (layerInmap.getZIndex() > zIndex) {
            this.setZindexToLayer(layerInmap, layerInmap.getZIndex() + 1)
          }
        } else if (layer.getZIndex() > zIndex) {
          // if the layer is going down
          if (layerInmap.getZIndex() >= zIndex) {
            this.setZindexToLayer(layerInmap, layerInmap.getZIndex() + 1)
          } else if (layerInmap.getZIndex() < zIndex) {
            this.setZindexToLayer(layerInmap, layerInmap.getZIndex() - 1)
          }
        }
      })

    }
    this.setZindexToLayer(layer, zIndex)
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

      try {
        if (layer.get('inToc')) {
          allZindex.push(layer.getZIndex())
        }
        // console.log(layer.get('nom'),layer.getZIndex())
      } catch (error) {
        console.error(error)
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
  displayFeatureInfo(pixel: number[], oddLayersAttr: string, oddLayersValues: Array<string>): Array<ImageLayer | TileLayer> {
    var layers: Array<ImageLayer | TileLayer> = []
    this.map.forEachLayerAtPixel(pixel,
      function (layer, rgb: Uint8ClampedArray) {

        if (layer) {

          if ((layer instanceof ImageLayer || layer instanceof TileLayer) && layer.get('descriptionSheetCapabilities') && oddLayersValues.indexOf(layer.get(oddLayersAttr)) == -1) {
            layers.push(layer)
          }
        }

      });

    return layers;
  }


  /**
    *click sur la carte
    *@param evt MapBrowserEvent
    *@param (param :dataFromClickOnMapInterface)=>void
    */
  mapHasCliked(evt: MapBrowserEvent, callback: (param: dataFromClickOnMapInterface) => void) {
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

    let layers: Array<ImageLayer | TileLayer | VectorLayer> = []

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
  getFeatureInfoFromWmsSource(source: ImageWMS, coordinates: Array<number>): string {
    var viewResolution = this.map.getView().getResolution();
    var url = source.getFeatureInfoUrl(coordinates, viewResolution, 'EPSG:3857', {}) + "&WITH_GEOMETRY=true&INFO_FORMAT=application/json&FI_LINE_TOLERANCE=17&FI_POLYGON_TOLERANCE=17&FI_POINT_TOLERANCE=17"
    return url
  }

  /**
   * Find a layer querryBle in a layer group : a VectorLayer or TileLayer
   * @param layer LayerGroup
   * @return any the layer
   */
  getLayerQuerryBleInLayerGroup(layer: LayerGroup): any {
    if (layer instanceof LayerGroup) {
      for (let index = 0; index < layer.getLayers().getArray().length; index++) {
        const element = layer.getLayers().getArray()[index];
        if (element instanceof TileLayer) {
          return element
        } else if (element instanceof VectorLayer) {
          return element
        }
      }
    } else {
      return layer
    }
  }

  /**
   * Fit view to an geometry or extent
   * @param geom Geometry|Extent geometry or extexnt
   * @param zoom number
   * @param padding  
   */
  fit_view(geom, zoom, padding?) {
    // if (padding == undefined) {
    //   padding = this.get_padding_map()
    // }
    // this.map.getView().animate({zoom: zoom}, {center: geom.getCoordinates()});

    // console.log([this.map.getSize()[0]- $('.sidenav-left').width() , this.map.getSize()[1] ])
    this.map.getView().fit(geom, {
      'maxZoom': zoom,
      'size': this.map.getSize(),
      'padding': [0, 0, 0, 0],
      'duration': 500
    })

  }

  /**
 * get map scale control for ol map
 * @param scaleType 'scaleline'|'scalebar'
 * @param target string id of the target html element
 * @returns ScaleLine
 */

  static scaleControl(scaleType: 'scaleline' | 'scalebar', target: string): ScaleLine {
    let scaleBarSteps = 4;
    let scaleBarText = true;
    let control;
    if (scaleType === 'scaleline') {
      control = new ScaleLine({
        units: 'metric',//'metric','nautical','us','degrees'
        target: target
      });
    } else if (scaleType === 'scalebar') {
      control = new ScaleLine({
        units: 'metric',
        target: target,
        bar: true,
        steps: scaleBarSteps,
        text: scaleBarText,
        minWidth: 140,
      });
    }
    return control;
  }

  /**
   * get mouse position control for ol map
   * @param target string id of the target html element
   * @returns MousePosition
   */

  static mousePositionControl(target: string): MousePosition {
    let mousePositionControl = new MousePosition({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326',
      // comment the following two lines to have the mouse position
      // be placed within the map.
      // className: 'custom-mouse-position',
      target: document.getElementById(target),
      undefinedHTML: 'WGS 84',
    });
    return mousePositionControl
  }

  /**
   * geolocate user : 
   * - get the geolocation layer
   * - clear all the features of the geolocation layer
   * - create a feature
   * - get the coordinates of the user
   * - set the coordiantes of the user to the feature
   * - add the feature in the geolocation layer
   * - Fit the view map to the user coordinates
   */
  geolocateUser() {
    if (this.getLayerByName('user_position').length == 0) {
      this.initialiserLayerGeoLocalisation()
    }
    let geolocalisationLayer = this.getLayerByName('user_position')[0]
    geolocalisationLayer.getSource().clear()

    let positionFeature = new Feature();
    positionFeature.setStyle(
      [
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({
              color: this.environment.primaryColor,
            }),
            // stroke: new Stroke({
            //   color: '#fff',
            //   width: 0,
            // }),
          }),
        }),
        new Style({
          image: new Icon({
            scale: 0.7,
            src: '/assets/icones/geolocation_pin.png',
            anchor: [0.5, 0.95]
          }),
          // text: new Text({
          //   font: "15px Calibri,sans-serif",
          //   fill: new Fill({ color: "#000" }),
          //   text:"Your position",
          //   stroke: new Stroke({ color: "#000", width: 1 }),
          //   padding: [10, 10, 10, 10],
          //   backgroundFill:new Fill({ color: "#fff" }),
          //   offsetX: 0,
          //   offsetY: 30,
          // })
        })
      ]
    );
    // 




    let geolocation = new Geolocation({
      // enableHighAccuracy must be set to true to have the heading value.
      trackingOptions: {
        enableHighAccuracy: true,
      },
      tracking: true,
      projection: this.map.getView().getProjection(),
    });

    geolocation.once('change:position', () => {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
      if (coordinates) {
        this.fit_view(new Point(coordinates), 18)
      }
    });

    geolocation.on('change:position', () => {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
    });

    geolocation.on('error', (e) => {
      console.error(e)
    });

    geolocalisationLayer.getSource().addFeature(positionFeature)
    console.log(geolocalisationLayer)
  }

  /**
   * initialise layer of the geolocation layer and add it to the map
   */
  initialiserLayerGeoLocalisation() {

    let geolocalisationLayer = new VectorLayer({
      source: new VectorSource({
      }),
    });
    geolocalisationLayer.set('nom', 'user_position')
    geolocalisationLayer.setZIndex(99999999)
    this.map.addLayer(geolocalisationLayer)
  }


}
