import {

  GeoJSON, Style, Fill, VectorLayer, VectorImageLayer, VectorSource, RasterSource, ImageLayer, ImageWMS, boundingExtent, transformExtent, Cluster, CircleStyle, Stroke, Text, Icon, TileLayer, XYZ, LayerGroup, TileWMS, Point, Feature
  , ScaleLine,
  MousePosition,
  createStringXY,
  MapBrowserEvent,
  Geometry,
  getProjection,
  OSM,
  VectorSourceEvent,
  VectorEventType,
  VectorTileSource,
  MVT,
  TileState,
  Polygon,
  GeometryLayout,
  FeatureLike,
} from '../app/ol-module'
import { BackendApiService } from '../app/services/backend-api/backend-api.service'
import { environment } from '../environments/environment'
import { Injectable, Injector } from '@angular/core'
import { AppInjector } from '../helper/app-injector.helper'
import { manageDataHelper } from './manage-data.helper'
import { HttpErrorResponse } from '@angular/common/http'
import { bindCallback, merge, Observable as rxjsObservable, from as rxjsFrom, throwError, timer, of, ReplaySubject, Subscription } from 'rxjs'
import { retryWhen, tap, delay, take, delayWhen, retry, shareReplay, map as rxjsMap, toArray, mergeMap, mergeAll, switchMap, flatMap, filter, concatMap, takeUntil, debounceTime, skip, takeLast } from 'rxjs/operators'
import Geolocation from 'ol/Geolocation';
import { Coordinate } from 'ol/coordinate'
import BaseLayer from 'ol/layer/Base'
import type { Extent as OLExtent } from 'ol/extent';

import { buffer, containsExtent, getCenter, getHeight, getTopLeft, getWidth } from 'ol/extent'
import { Box3, BatchedMesh, Color, EqualDepth, FloatType, Frustum, GreaterDepth, GreaterEqualDepth, Group, Line, LinearFilter, Material, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, PerspectiveCamera, Points, PointsMaterial, Sphere, SphereGeometry, SpriteMaterial, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, Vector4, WebGLRenderer, CircleGeometry, BufferAttribute, BufferGeometry, Sprite, InstancedMesh, DoubleSide, Object3D, RepeatWrapping, RawShaderMaterial, ShaderMaterial, IcosahedronGeometry, InstancedBufferAttribute, Quaternion, DynamicDrawUsage, Float32BufferAttribute, Uniform, InterleavedBuffer, InterleavedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, CameraHelper, AxesHelper, Euler, Fog } from 'three'
import { BufferGeometryUtils, ConvexGeometry, MapControls } from 'three/examples/jsm/Addons'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer'
import {
  Extent,
  Instance,
  Map as MapGiro3d,
  Coordinates,
  ColorLayer,
  TiledImageSource,
  PickObjectsAtOptions,
  Target,
  MapPickResult,
  OrbitControls,
  LayeredMaterial,
  Layer, LayerEvents, LayerUserData,
  ScreenSpaceError,
  LayerUpdateState,
  FeatureCollection,
  tile,
  GlobalCache,
  Context,
  OLUtils,
  InstanceEvents,
} from "../app/giro-3d-module"
import { createXYZ } from 'ol/tilegrid'
import { features } from 'process'
import SurfaceMesh from '@giro3d/giro3d/renderer/geometries/SurfaceMesh'
import PointMesh from '@giro3d/giro3d/renderer/geometries/PointMesh'
import Projection from 'ol/proj/Projection'
import { fromUserExtent, toUserExtent } from 'ol/proj'
import { L } from '@angular/cdk/keycodes'
import { fromInstanceGiroEvent, fromMapGiroEvent } from '../app/shared/class/fromGiroEvent'
import { fromOpenLayerEvent } from '../app/shared/class/fromOpenLayerEvent'
import Entity, { EntityUserData } from '@giro3d/giro3d/entities/Entity'
import Entity3D, { Entity3DEventMap } from '@giro3d/giro3d/entities/Entity3D'
import TileGrid from 'ol/tilegrid/TileGrid'
import { fromKey, TileCoord } from 'ol/tilecoord'
import { TileSourceEvent } from 'ol/source/Tile'

import { FillStyle, StrokeStyle } from '@giro3d/giro3d/core/FeatureTypes'
import { MapsService } from '../app/data/services/maps.service'
import { Tile, VectorRenderTile } from 'ol'
import { PointsLayer } from '../app/processing/points'
import { layer } from '@fortawesome/fontawesome-svg-core'
import { TRUE } from 'ol/functions'
import { gsap } from "gsap";
import { posix } from 'path'
import { TubeLineStringLayer } from '../app/processing/linestring/tube-linestring'
import { FlatLineStringLayer } from '../app/processing/linestring/flat-linestring'
import { DataOSMLayer, LayerGiroUserData, LayersInMap, TypeLayer } from './type'


/**
 * Handle diverse operation in link with the map
 */
@Injectable()
export class CartoHelper {

  environment = environment
  BackendApiService: BackendApiService = AppInjector.get(BackendApiService);
  mapsService: MapsService = AppInjector.get(MapsService);
  // perspective camera, to be add/use
  camera: PerspectiveCamera;
  instance: Instance
  controls: OrbitControls

  constructor(
    public map: MapGiro3d,
  ) {
    this.instance = this.map["_instance"] as Instance;
    this.camera = this.instance.view.camera as PerspectiveCamera
    this.controls = this.instance.view.controls as OrbitControls
  }


  // /**
  //  * Construct a shadow layer
  //  * @returns ImageLayer
  //  */
  // constructShadowLayer(featureToShadow: Feature<Geometry>[]) {
  //   var worldGeojson = {
  //     "type": "FeatureCollection",
  //     "name": "world_shadow",
  //     "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },
  //     "features": [
  //       { "type": "Feature", "properties": { "id": 0 }, "geometry": { "type": "Polygon", "coordinates": [[[-19824886.222640071064234, 19848653.805728208273649], [19467681.065475385636091, 19467681.065475385636091], [19753445.191207133233547, -15987945.626927629113197], [-19824886.222640071064234, -15967070.525261469185352], [-19824886.222640071064234, 19848653.805728208273649]]] } }
  //     ]
  //   }

  //   // var featureToShadow = new GeoJSON().readFeatures(geojsonLayer, {
  //   //   dataProjection: 'EPSG:4326',
  //   //   featureProjection: 'EPSG:3857'
  //   // });

  //   var featureWorld = new GeoJSON().readFeatures(worldGeojson);

  //   var rasterSource_world = new VectorImageLayer({
  //     source: new VectorSource({
  //       features: featureWorld
  //     }),
  //     // projection: 'EPSG:3857',
  //     style: new Style({
  //       fill: new Fill({
  //         color: [0, 0, 0, 0.6]
  //       })
  //     })
  //   });

  //   var rasterSource_cmr = new VectorImageLayer({
  //     source: new VectorSource({
  //       features: featureToShadow
  //     }),
  //     // projection: 'EPSG:3857',
  //     style: new Style({
  //       fill: new Fill({
  //         color: [0, 0, 0, 0.1]
  //       })
  //     })
  //   });


  //   var raster = new RasterSource({
  //     sources: [
  //       rasterSource_world,
  //       rasterSource_cmr
  //     ],
  //     operation: function (pixels, data) {
  //       if (pixels[1][3] == 0) {
  //         return pixels[0];
  //       } else {
  //         return [0, 0, 0, 1]
  //       }
  //     }
  //   });

  //   var rasterLayer = new ImageLayer({
  //     source: raster,
  //     /**
  //      * so that map.forEachLayerAtPixel work as expected
  //      * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
  //      */
  //     className: 'map-shadow',

  //   });
  //   rasterLayer.set('nom', 'map-shadow')

  //   // return rasterLayer

  // }

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

  calculatePlaneDimensions(camera: PerspectiveCamera, distance) {
    const vFOV = MathUtils.degToRad(camera.fov); // Convert vertical FOV to radians
    const height = 2 * Math.tan(vFOV / 2) * distance; // Visible height
    const width = height * camera.aspect; // Visible width

    return { width, height };
  }



  /**
   * Set properties to a layer
   * @param layer
   * @param couche
   */
  static setPropertiesToLayer(layer: Layer, couche: DataOSMLayer) {

    layer.userData.properties = couche.properties
    layer.userData.nom = couche.nom
    layer.userData.type_layer = couche.type_layer
    layer.userData.image = couche.iconImagette
    layer.userData.identifiant = couche.identifiant ? couche.identifiant.join(',') : undefined
    layer.userData.inToc = couche.inToc
    layer.userData.tocCapabilities = couche.tocCapabilities
    layer.userData.legendCapabilities = couche.legendCapabilities
    layer.userData.descriptionSheetCapabilities = couche.descriptionSheetCapabilities
    layer.userData.destroyedInstancedMesh$ = couche.destroyedInstancedMesh$ ? couche.destroyedInstancedMesh$ : undefined

  }

  /**
   * Add any type of layer in the map
   * @param layer layer to add
   */
  static addLayerToMap(layer: Layer, map: MapGiro3d) {
    if (!layer.userData.nom) {
      throw new Error("Layer must have a 'nom' properties");
    }

    if (!layer.userData.type_layer) {
      throw new Error("Layer must have a 'type_layer' properties");
    }

    if (TypeLayer.indexOf(layer.userData.type_layer as string) == -1) {
      throw new Error("Layer must have a 'type_layer' properties among " + TypeLayer.join(','));
    }

    if ((layer.userData.nom) && layer.userData.type_layer) {
      map.addLayer(layer)
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
  getAllLAyerInMap(): Array<Layer> {
    // var responseLayers = []
    // this.map.getLayers().forEach((group) => {
    //   responseLayers.push(group)
    // });
    return this.map.getLayers()
  }

  /**
   * Remove any type of layer in the map
   */
  removeLayerToMap(layer: Layer) {
    this.map.removeLayer(layer)

    if (layer.userData.destroyedInstancedMesh$) {
      (layer.userData.destroyedInstancedMesh$ as ReplaySubject<boolean>).next(true);
      (layer.userData.destroyedInstancedMesh$ as ReplaySubject<boolean>).complete()
    }

  }

  /**
   * Make a layer invisible in th map
   * @param layer
   */
  setLayerInvisible(layer: Layer) {
    layer.visible = false
  }

  /**
   * Make a layer visible in th map
   * @param layer
   */
  setLayerVisible(layer: Layer) {
    layer.visible = true
  }

  /**
   * Get list of layer by thier names
   * @param name string 'nom' of layer to search
   * @param isLayerGroup boolean is the layeys we want are in a layergroup ?
   * @return Array<any>
   */
  getLayerByName(name: string, isLayerGroup: boolean = false): Array<ColorLayer> {
    var layer_to_remove = []
    var all_layers = this.map.getLayers()

    for (let index = 0; index < all_layers.length; index++) {
      var layer = all_layers[index]
      if (layer.userData.nom == name || layer.name == name) {
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
  getLayerByProperties(properties: Object, isLayerGroup: boolean = false): Array<Layer> {
    var layer_to_remove = []
    var all_layers = this.map.getLayers()

    for (let index = 0; index < all_layers.length; index++) {
      var layer = all_layers[index]
      var correspondanceLenght = 0

      for (const key in properties) {
        if (properties.hasOwnProperty(key) && layer.userData && layer.userData[key] != undefined) {
          const element = properties[key];
          if (properties[key] == layer.userData[key]) {
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
  getLayerByPropertiesCatalogueGeosm(properties: { group_id?: number, couche_id: number, type: 'couche' | 'carte' }): Array<Layer> {

    return this.getAllLAyerInMap()
      .filter((layer) => layer.userData.properties != undefined)
      .filter((layer) => {
        if (properties.group_id) {
          return layer.userData.properties['type'] == properties.type && layer.userData.properties['group_id'] == properties.group_id && layer.userData.properties['couche_id'] == properties.couche_id
        } else {
          return layer.userData.properties['type'] == properties.type && layer.userData.properties['couche_id'] == properties.couche_id
        }
      })

  }

  getLayerInToc(couche_id: number, type: 'couche' | 'carte') {
    return this.getAllLayersInToc().find((layer_in_map) => layer_in_map.properties.couche_id == couche_id && layer_in_map.properties.type == type)
  }

  /**
   * Get all layers in the TOC.
   * Remark : all layer not in group call "group-layer-shadow"
   * @return Array<layersInMap>
   */
  getAllLayersInToc(): Array<LayersInMap> {
    var reponseLayers: Array<LayersInMap> = []
    // this.map:Map = this.map as Map
    var allLayers = this.map.getLayers()

    for (let index = 0; index < allLayers.length; index++) {
      const layer = allLayers[index];
      if (layer.userData.inToc) {
        reponseLayers.push(this.constructLayerInMap(layer))
      }
    }

    let cloneAllLayers = [...reponseLayers]
    let duplicates: Array<LayersInMap> = []
    let duplicatesGrouped: Array<LayersInMap> = []
    function flatDeep(arr) {
      return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val), []);
    };
    let layerOfSameGroup = cloneAllLayers.find((nnn, index) => {
      return cloneAllLayers.find((x, ind) => x.properties.couche_id + x.properties['type'] === nnn.properties.couche_id + nnn.properties['type'] && index !== ind)
    })
    while (layerOfSameGroup) {
      let allInstanceDuplicates = reponseLayers.filter((t) => t.properties.couche_id + t.properties['type'] === layerOfSameGroup.properties.couche_id + layerOfSameGroup.properties['type'])
      allInstanceDuplicates.map((t) => duplicates.push(t))
      let allLayersDuplicate: Array<Layer<LayerEvents, LayerGiroUserData>> = flatDeep(allInstanceDuplicates.map((h) => h.layer))
      let clone = { ...layerOfSameGroup }
      clone.layer = allLayersDuplicate
      duplicatesGrouped.push(clone)

      let duplicatesKey = duplicates.map((y) => y.properties.couche_id + y.properties['type'])
      cloneAllLayers = cloneAllLayers.filter((g) => !duplicatesKey.includes(g.properties.couche_id + g.properties['type']))

      layerOfSameGroup = cloneAllLayers.find((nnn, index) => {
        return cloneAllLayers.find((x, ind) => x.properties.couche_id + x.properties['type'] === nnn.properties.couche_id + nnn.properties['type'] && index !== ind)
      })
    }

    duplicatesGrouped.map((ll) => cloneAllLayers.push(ll))
    return cloneAllLayers
  }

  /**
   * construct a layersInMap Object fron a layer in the map
   * @param layer BaseLayer
   * @return layersInMap
   */
  constructLayerInMap(layer: Layer): LayersInMap {

    let layer_ = layer as Layer<LayerEvents, LayerGiroUserData>
    const threeLayers: Array<Group> = []
    this.instance.scene.traverse((obj) => {
      if (obj instanceof Group && obj.userData.isLayer && obj.userData.name == layer_.userData.nom) {
        threeLayers.push(obj)
      }
    })

    // let threeLayers = this.map["_instance"]
    //   .getObjects(
    //     (obj) =>
    //       obj instanceof Group && obj.userData.isLayer && obj.userData.name == layer_.userData.nom
    //   ) as Array<Group>

    const visible = layer.visible || threeLayers.find((obj) => obj.visible) != undefined

    return {
      tocCapabilities: layer_.userData.tocCapabilities,
      legendCapabilities: layer_.userData.legendCapabilities,
      nom: layer_.userData.nom,
      type_layer: layer_.userData.type_layer,
      properties: layer_.userData.properties,
      image: layer_.userData.image,
      data: null,
      zIndex: this.map.getIndex(layer),
      visible: visible,
      layer: [layer_],
      threeLayers: threeLayers,
      descriptionSheetCapabilities: layer_.userData.descriptionSheetCapabilities
    }
  }



  /**
   * Get max z index of map layers that are in the TOC
   * @return number
   */
  getMaxZindexInMap(): number {
    return this.map.getLayers().length - 1
  }


  /**
   * Detect all layers of type WMS (ImageLayer or TileLayer) on a pixel
   * We can also rempve layers that have certains values (oddLayersValues) for attributes (oddLayersAttr)
   * @param number[] pixel
   * @param string oddLayersAttr
   * @param Array<string> oddLayersValues
   * @returns Array<ImageLayer>
   */
  displayFeatureInfo(pixel: number[], oddLayersAttr: string, oddLayersValues: Array<string>): Array<Layer> {
    var layers: Array<Layer> = []
    // this.map.forEachLayerAtPixel(pixel,
    //   function (layer, rgb: Uint8ClampedArray) {

    //     if (layer) {

    //       if ((layer instanceof ImageLayer || layer instanceof TileLayer) && layer.get('descriptionSheetCapabilities') && oddLayersValues.indexOf(layer.get(oddLayersAttr)) == -1) {
    //         layers.push(layer)
    //       }
    //     }

    //   });

    return layers;
  }



  getVisibleExtent() {
    // NOT USE IN CODE, NOT SURE THIS IS A GOOD APPROCH, INSTEAD USE METHOD getMapExtent()

    const instance = this.map["_instance"] as Instance
    const camera = instance.view.camera as PerspectiveCamera
    let controls = instance.view.controls as OrbitControls


    // Update the camera matrix
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();


    const frustum = new Frustum();
    const matrix = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);

    // Get the corners of the near and far planes
    // const near = camera.near;
    const near = instance.view.camera.position.distanceTo(controls.target);
    const far = camera.far;

    const fov = camera.fov * (Math.PI / 180);
    const aspect = camera.aspect;

    const heightNear = 2 * Math.tan(fov / 2) * near;
    const widthNear = heightNear * aspect;

    const heightFar = 2 * Math.tan(fov / 2) * far;
    const widthFar = heightFar * aspect;
    // camera.position.z
    // let width = 2 * Math.tan((hFOV / 2)) * controls.getDistance();

    // Calculate the world coordinates of the frustum corners
    const center = new Vector3().setFromMatrixPosition(camera.matrixWorld);

    const cornersNear = [
      new Vector3(-widthNear / 2, -heightNear / 2, near),
      new Vector3(widthNear / 2, -heightNear / 2, near),
      new Vector3(widthNear / 2, heightNear / 2, near),
      new Vector3(-widthNear / 2, heightNear / 2, near)
    ];

    const cornersFar = [
      new Vector3(-widthFar / 2, -heightFar / 2, far),
      new Vector3(widthFar / 2, -heightFar / 2, far),
      new Vector3(widthFar / 2, heightFar / 2, far),
      new Vector3(-widthFar / 2, heightFar / 2, far)
    ];

    // Apply the camera world matrix to the corners
    cornersNear.forEach(corner => corner.applyMatrix4(camera.matrixWorld));
    cornersFar.forEach(corner => corner.applyMatrix4(camera.matrixWorld));

    return {
      near: {
        width: widthNear,
        height: heightNear,
        corners: cornersNear
      },
      far: {
        width: widthFar,
        height: heightFar,
        corners: cornersFar
      }
    };
  }
  /**
    *click sur la carte
    *@param evt MapBrowserEvent
    *@param (param :dataFromClickOnMapInterface)=>void
    */
  // mapHasClicked(evt: MouseEvent, callback: (param: dataFromClickOnMapInterface) => void) {
  //   const pickOptions: PickObjectsAtOptions =
  //   {
  //     limit: Infinity,
  //     radius: 0,
  //     // gpuPicking: true,  
  //     sortByDistance: true,
  //     // pickFeatures: true
  //   };
  //   const instance = this.map["_instance"] as Instance;
  //   // instance.pickObjectsAt()
  //   const mouse_vector = instance.eventToCanvasCoords(evt, new Vector2())
  //   const map_pick_result: Array<any> = instance.pickObjectsAt(evt, pickOptions)
  //   // const map_pick_result: Array<MapPickResult> = this.map.pick(mouse_vector, pickOptions)
  //   if (map_pick_result.length > 0) {
  //     // const buildings = map_pick_result.filter((res) => res.object.type == "Mesh")
  //     // buildings.map((b) => (b.object as Mesh).geometry.index.count / 3)
  //     console.log(map_pick_result, "mapHasClicked")
  //     let layers_clicked = []
  //     for (let index = 0; index < this.map.getLayers().length; index++) {
  //       const layer = this.map.getLayers()[index] as ColorLayer;
  //       if (layer.source.type == "VectorSource") {
  //         continue
  //       }
  //       if (layer.userData.descriptionSheetCapabilities == undefined) {
  //         continue
  //       }
  //       let targets = Array.from(layer["_targets"].values()) as Array<Target>
  //       const target = targets.find((t: Target) => t.node.uuid == map_pick_result[0].object.uuid)

  //       const material = target.node.material as LayeredMaterial
  //       const layerTextureInfo = material.texturesInfo.color.infos[this.map.getIndex(layer)]


  //       let uv = target.extent.offsetInExtent(map_pick_result[0].coord, new Vector2());
  //       let i, j
  //       if (layerTextureInfo) {
  //         const transformed = layerTextureInfo.offsetScale.transform(uv)
  //         const uu = MathUtils.clamp(transformed.x, 0, 1);
  //         const vv = MathUtils.clamp(transformed.y, 0, 1);

  //         i = MathUtils.clamp(Math.round(uu * target.width - 1), 0, target.width);
  //         j = MathUtils.clamp(Math.round(vv * target.height - 1), 0, target.height);
  //       }

  //       const renderer = layer["_composer"].composer["_renderer"] as WebGLRenderer


  //       let pixels = new Uint8Array(10 * 10 * 4);
  //       renderer.readRenderTargetPixels(
  //         target["renderTarget"],
  //         target.width * uv.x, target.height * uv.y, 10, 10, pixels
  //       );

  //       // console.log(target.width * uv.x, target.height * uv.y)
  //       // console.log(layer.name, distance_between_mousse_cursor_and_target_left_corner_x / target_resolution, distance_between_mousse_cursor_and_target_left_corner_y / target_resolution, pixels.reduce((sum, number) => sum + number) > 0)

  //       if (pixels.reduce((sum, number) => sum + number) > 0) {
  //         layers_clicked.push(layer)
  //       }
  //     }

  //     if (layers_clicked.length > 0) {
  //       var data_callback: dataFromClickOnMapInterface = {
  //         type: 'raster',
  //         data: {
  //           coord: map_pick_result[0].coord,
  //           point: map_pick_result[0].point,
  //           layers: layers_clicked,
  //         }
  //       }
  //       callback(data_callback)
  //     }
  //   } else {
  //     var data_callback: dataFromClickOnMapInterface = {
  //       type: 'clear',
  //       data: {
  //         coord: map_pick_result[0].coord,
  //         point: map_pick_result[0].point,
  //         layers: []
  //       }
  //     }
  //     callback(data_callback)
  //   }

  //   // const results = instance.pickObjectsAt(evt, pickOptions);

  //   // var pixel = this.map.getEventPixel(evt.originalEvent);

  //   //   var feature = this.map.forEachFeatureAtPixel(pixel,
  //   //     function (feature, layer) {
  //   //       return feature;
  //   //     }, {
  //   //     hitTolerance: 5
  //   //   });

  //   //   var layer = this.map.forEachFeatureAtPixel(pixel,
  //   //     function (feature, layer) {
  //   //       if (layer instanceof VectorLayer) {
  //   //         return layer;
  //   //       }

  //   //     }, {
  //   //     hitTolerance: 5
  //   //   });

  //   //   let layers: Array<Layer> = []

  //   //   if (!feature) {
  //   //     var all_pixels = new manageDataHelper().calcHitMatrix(evt.pixel)
  //   //     for (let index = 0; index < all_pixels.length; index++) {
  //   //       var un_pixel = all_pixels[index];
  //   //       var nom_layers_load = []

  //   //       for (let i = 0; i < layers.length; i++) {
  //   //         nom_layers_load.push(layers[i].userData.nom);
  //   //       }

  //   //       var layers_in_pixels = this.displayFeatureInfo(un_pixel, 'nom', nom_layers_load)

  //   //       for (let j = 0; j < layers_in_pixels.length; j++) {
  //   //         layers.push(layers_in_pixels[j]);
  //   //       }

  //   //     }
  //   //   }

  //   //   if (layer instanceof VectorLayer && feature) {
  //   //     /**
  //   //      * if the user click on a cluser, and the cluster have more than one feature, we zoom in; but if ther is only one feature, we return the feature
  //   //      *
  //   //     */

  //   //     if (layer.getSource() instanceof Cluster) {
  //   //       var numberOfFeatureInCluster = this.countFeaturesInCluster(feature.get('features'));
  //   //       // console.log(layer,feature,numberOfFeatureInCluster)
  //   //       if (numberOfFeatureInCluster > 1) {
  //   //         if (Object.create(feature.getGeometry()).getType() == 'Point') {
  //   //           var coordinate = Object.create(feature.getGeometry()).getCoordinates();
  //   //           var geom = new Point(coordinate)
  //   //           this.fit_view(geom, this.map.getView().getZoom() + 2)
  //   //         }
  //   //       } else if (numberOfFeatureInCluster == 1) {
  //   //         var feat = this.getFeatureThatIsDisplayInCulster(feature.getProperties().features)
  //   //         var coord = this.map.getCoordinateFromPixel(pixel)
  //   //         var data_callback: dataFromClickOnMapInterface = {
  //   //           type: 'vector',
  //   //           data: {
  //   //             coord: coord,
  //   //             layers: [layer as any],
  //   //             feature: feat,
  //   //             data: {}
  //   //           }
  //   //         }

  //   //         callback(data_callback)
  //   //       }

  //   //     }

  //   //     // var coord = this.map.getCoordinateFromPixel(pixel)
  //   //     // var data_callback: dataFromClickOnMapInterface = {
  //   //     //   'type': 'clear_elem_geo_surbrillance',
  //   //     //   data: {
  //   //     //     coord: coord,
  //   //     //     layers: layers
  //   //     //   }
  //   //     // }
  //   //     // callback(data_callback)

  //   //   } else if (layers.length > 0) {
  //   //     var coord = this.map.getCoordinateFromPixel(pixel)
  //   // var data_callback: dataFromClickOnMapInterface = {
  //   //   type: 'raster',
  //   //   data: {
  //   //     coord: coord,
  //   //     layers: layers
  //   //   }
  //   // }
  //   // callback(data_callback)

  //   //   } else {
  //   //     var coord = this.map.getCoordinateFromPixel(pixel)
  //   //     var data_callback: dataFromClickOnMapInterface = {
  //   //       'type': 'clear',
  //   //       data: {
  //   //         coord: coord,
  //   //         layers: layers
  //   //       }
  //   //     }
  //   //     callback(data_callback)
  //   //   }
  // }

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
  // getFeatureInfoFromWmsSource(source: ImageWMS, coordinates: Array<number>): string {
  //   var viewResolution = this.map.getView().getResolution();
  //   var url = source.getFeatureInfoUrl(coordinates, viewResolution, 'EPSG:3857', {}) + "&WITH_GEOMETRY=true&INFO_FORMAT=application/json&FI_LINE_TOLERANCE=17&FI_POLYGON_TOLERANCE=17&FI_POINT_TOLERANCE=17"
  //   return url
  // }

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

      // undefinedHTML: 'WGS 84',
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
    // geolocalisationLayer.getSource().clear()

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
      // projection: this.map.getView().getProjection(),
    });

    geolocation.once('change:position', () => {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
      if (coordinates) {
        // this.fit_view(new Point(coordinates), 18)
      }
    });

    geolocation.on('change:position', () => {
      var coordinates = geolocation.getPosition();
      positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
    });

    geolocation.on('error', (e) => {
      console.error(e)
    });

    // geolocalisationLayer.getSource().addFeature(positionFeature)
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
    // this.map.addLayer(geolocalisationLayer)
  }

  /**
   * Get the current point of view, use to share map position
   * @param map 
   */
  static getCurrentPointOfView(map: MapGiro3d) {
    function round10(n) {
      return Math.round(n * 10) / 10;
    }
    const instance: Instance = map["_instance"]
    const cam = instance.view.camera.position;
    const target = (instance.view.controls as OrbitControls).target;
    return `${round10(cam.x)},${round10(cam.y)},${round10(cam.z)},${round10(target.x)},${round10(target.y)},${round10(target.z)}`;

  }

  /**
   * Move camera to a point of view
   * @param map 
   * @param pov 
   */
  static get_parameters_from_pov(map: MapGiro3d, pov: string) {
    const [x, y, z, tx, ty, tz] = pov.split(',').map(s => Number.parseFloat(s));

    if (![x, y, z, tx, ty, tz].every(item => item != undefined && !isNaN(item)) || [x, y, z, tx, ty, tz].reduce((accumulator, currentValue) => {
      return accumulator + currentValue
    }, 0) == 0) {
      throw new Error("Bad position")
    }
    return [x, y, z, tx, ty, tz]
    // const instance: Instance = map["_instance"]
    // instance.view.camera.position.set(x, y, z);
    // instance.view.camera.updateProjectionMatrix();
    // (instance.view.controls as OrbitControls).target.set(tx, ty, tz);
    // (instance.view.controls as OrbitControls).saveState()
    // instance.notifyChange(instance.view.camera, {
    //   immediate: true,
    //   needsRedraw: true
    // });
  }

  // static _getMapExtent(map: Map) {
  //   const instance = map["_instance"] as Instance;
  //   const camera = instance.view.camera as PerspectiveCamera
  //   const fog = instance.scene.fog as Fog

  //   const fov = camera.fov * (Math.PI / 180); // Convert to radians
  //   const aspect = camera.aspect;
  //   const near = camera.near;
  //   const far = camera.far;

  //   function calculateFrustumDimensions(distance) {
  //     const height = 2 * distance * Math.tan(fov / 2);
  //     const width = height * aspect;
  //     return { width, height };
  //   }


  //   const fogNear = fog.near;
  //   const fogFar = fog.far;

  //   const nearDimensions = calculateFrustumDimensions(fogNear);
  //   const farDimensions = calculateFrustumDimensions(fogFar);

  //   // Define corners in camera space
  //   const nearHalfWidth = nearDimensions.width / 2;
  //   const nearHalfHeight = nearDimensions.height / 2;
  //   const farHalfWidth = farDimensions.width / 2;
  //   const farHalfHeight = farDimensions.height / 2;

  //   const nearPlaneZ = -fogNear;
  //   const farPlaneZ = -fogFar;

  //   const corners = [
  //     // Near Plane
  //     new Vector3(-nearHalfWidth, -nearHalfHeight, nearPlaneZ),
  //     new Vector3(nearHalfWidth, -nearHalfHeight, nearPlaneZ),
  //     new Vector3(nearHalfWidth, nearHalfHeight, nearPlaneZ),
  //     new Vector3(-nearHalfWidth, nearHalfHeight, nearPlaneZ),
  //     // Far Plane
  //     new Vector3(-farHalfWidth, -farHalfHeight, farPlaneZ),
  //     new Vector3(farHalfWidth, -farHalfHeight, farPlaneZ),
  //     new Vector3(farHalfWidth, farHalfHeight, farPlaneZ),
  //     new Vector3(-farHalfWidth, farHalfHeight, farPlaneZ),
  //   ];

  //   // Transform corners to world space
  //   for (let i = 0; i < corners.length; i++) {
  //     corners[i].applyMatrix4(camera.matrixWorld);
  //   }

  //   // Create a bounding box
  //   const boundingBox = new Box3().setFromPoints(corners);

  //   return Extent.fromBox3("EPSG:3857", boundingBox)

  // }

  /**
   * Return the extent of the map in EPSG 3857
   * @returns Extent
   */
  static getMapExtent(map: MapGiro3d) {

    const instance = map["_instance"] as Instance;
    const camera = instance.view.camera as PerspectiveCamera
    const canvasSize = instance.engine.getWindowSize();

    const raycast = (x: number, y: number) => {
      const results = instance.pickObjectsAt(new Vector2(x, y), { limit: 1, radius: 0, });
      const point = results[0]?.point;
      if (point) {
        const result = new Coordinates(instance.referenceCrs, point.x, point.y, 1)
          .as("EPSG:3857")
          .toVector3();
        result.z = 1;
        return result;
      }
      return undefined;
    };

    let ul = raycast(0, 0);
    let ur = raycast(canvasSize.x - 1, 0);
    let ll = raycast(0, canvasSize.y - 1);
    let lr = raycast(canvasSize.x - 1, canvasSize.y - 1);

    if (!ul || !ur || !ll || !lr) {
      return undefined;
    }


    if (!ul || !ur || !ll || !lr) {
      return undefined;
    }

    const box = new Box3();


    box.setFromPoints([ul, ur, ll, lr]);

    const extent = Extent.fromBox3("EPSG:3857", box)

    return extent
  }


  /**
   * Return half of extent of the map in EPSG 
   * @returns Extent
   */
  static getHalfMapExtent(map: MapGiro3d) {

    const instance = map["_instance"] as Instance;
    const camera = instance.view.camera as PerspectiveCamera
    const canvasSize = instance.engine.getWindowSize();

    const raycast = (x: number, y: number) => {
      const results = instance.pickObjectsAt(new Vector2(x, y), { limit: 1, radius: 0, });
      const point = results[0]?.point;
      if (point) {
        const result = new Coordinates(instance.referenceCrs, point.x, point.y, 1)
          .as("EPSG:3857")
          .toVector3();
        result.z = 1;
        return result;
      }
      return undefined;
    };

    let ul = raycast(0, 0);
    let ur = raycast(canvasSize.x - 1, 0);
    let ll = raycast(0, canvasSize.y - 1);
    let lr = raycast(canvasSize.x - 1, canvasSize.y - 1);

    if (!ul || !ur || !ll || !lr) {
      return undefined;
    }

    if (Math.abs(ur.y - ul.y) > 500) {

      ul = raycast(0, canvasSize.y / 2);
      ur = raycast(canvasSize.x - 1, canvasSize.y / 2);
    }

    if (!ul || !ur || !ll || !lr) {
      return undefined;
    }

    const box = new Box3();


    box.setFromPoints([ul, ur, ll, lr]);

    const extent = Extent.fromBox3("EPSG:3857", box)

    return extent
  }

  static isMobile() {
    return window.innerWidth < 450
  }

  panTo(position: Vector3) {

    const offset = new Vector3().subVectors(this.camera.position, this.controls.target);

    gsap.to(this.controls.target, {
      x: position.x,
      y: position.y,
      ease: "power4.in",
      duration: 1,
      onUpdate: () => {
        this.camera.position.copy(this.controls.target).add(offset);
        this.controls.update()
        this.controls.saveState()
        this.instance.notifyChange([this.camera], {
          immediate: true,
          needsRedraw: true
        })
      }
    })

    if (this.camera.position.z > 1000) {

      gsap.to(this.camera.position, {
        z: 1000,
        ease: "power2.out",
        delay: 2,
        duration: 2,
        onUpdate: () => {
          this.instance.notifyChange([this.camera], {
            immediate: true,
            needsRedraw: true
          })
        },
        onComplete: () => {
          this.controls.update()
          this.controls.saveState()
        }
      })
    }


  }

  zoomToExtent(lookAtExtent: Extent, lookAtAltitude = 0) {
    // return
    const camera = this.map["_instance"].view.camera as PerspectiveCamera
    // camera.updateProjectionMatrix();
    // camera.updateMatrixWorld();
    const hFov = MathUtils.degToRad(camera.fov) / 2;

    const altitude =
      (Math.max(
        lookAtExtent.dimensions().x / camera.aspect,
        lookAtExtent.dimensions().y,
      ) /
        Math.tan(hFov)) *
      0.5;
    // const position = lookAtExtent.centerAsVector3().add(new Vector3(0, 0, altitude));
    const extentCenter = lookAtExtent.center()
    const lookAt = lookAtExtent.centerAsVector3();
    lookAt.z = lookAtAltitude;
    // const lookAt = new Vector3(143404, 5919907, 100);
    // instance.view.camera.lookAt(lookAt);
    // place camera above
    // ,5919907.573688
    // camera.position.set(143404.643552, 5919907.573688, 2000);
    camera.position.set(extentCenter.x, extentCenter.y, altitude);

    camera.updateProjectionMatrix();
    // camera.position.copy(new Vector3(extentCenter.x, extentCenter.y, 0));
    // console.log(camera.position, extentCenter.x, extentCenter.y)
    // camera.far = 40
    // camera.updateProjectionMatrix()
    // this.instance.scene.position.copy(camera.position);
    // look down
    camera.lookAt(lookAt)

    // const offset = new Vector3().copy(camera.position);
    // this.instance.scene.position.sub(offset);
    // Reset the camera's position to the origin
    // camera.position.set(0, 0, 0);

    // this.instance.scene.position.copy(camera.position);
    // this.instance.scene.position.cent
    // camera.position.set(0, 0, 0);
    // camera.lookAt(new Vector3(0, 0, -1));
    // camera.updateProjectionMatrix();
    // camera.lookAt(new Vector3(extentCenter[0], extentCenter[1], altitude))
    // make sure the camera isn't rotating around its view axis
    // camera.rotation.z = 0;
    // camera.rotation.x = 0.01; // quickfix to avoid bizarre jumps

    const instance: Instance = this.map["_instance"];

    (instance.view.controls as MapControls).target.copy(lookAt);
    (instance.view.controls as OrbitControls).saveState();
    instance.notifyChange(camera, {
      immediate: true,
      needsRedraw: true
    });


    // this.recenterScene()
  }

  // Function to re-center the scene
  recenterScene() {
    const instance: Instance = this.map["_instance"];
    const camera = instance.view.camera as PerspectiveCamera
    camera.updateProjectionMatrix();
    // Calculate the offset between the camera's current position and the origin
    const offset = new Vector3().copy(camera.position);

    // Move the entire scene to compensate
    this.instance.scene.position.sub(offset);
    this.instance.scene.updateMatrixWorld()

    // camera.position.set(0, 0, 0);


    this.instance.scene.children.forEach(child => {
      child.position.sub(offset);
    });
    const controls = this.instance.view.controls as MapControls



    // controls.target.applyEuler(new Euler(0, 0, Math.PI / 6))
    // controls.target.applyAxisAngle(new Vector3(0, 0, 1), Math.PI)
    // controls.target.x = offset.x
    // controls.target.y = 5863258.391489949
    // { x: -36873.482051052655, y: -132560.09515604135, z: -6063408.676844352 }
    // 5863258.391489949
    // controls.target.copy(this.map.object3d.position)
    controls.target.sub(offset);
    controls.target.z = -(offset.z * 2)
    // Update all objects in the scene accordingly
    // controls.target.applyQuaternion(
    //   new Quaternion().setFromRotationMatrix(
    //     new Matrix4()
    //       // .setPosition(offset)
    //       .makeRotationX(Math.PI)
    //       .makeRotationZ(Math.PI)
    //     // .makeRotationY(Math.PI / 2)
    //   )
    // )
    // controls.target.x = 0
    // controls.target.y = 0
    // controls.target.z = 0
    console.log(controls.target, "offser.y")
    controls.saveState();

    const axesHelper = new AxesHelper(999999999999999999);
    axesHelper.setColors(
      // xAxis
      "red",
      // Yaxis
      "green",
      // Z axis
      "blue"
    )
    this.instance.add(axesHelper);

    const helper = new CameraHelper(camera);
    helper.matrixAutoUpdate = true
    this.instance.add(helper);

    // girod a besoin que l'axe vert (y) soit l'axe parallèle à mon ecran, et X perpendiculaire
    fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
      tap(() => {
        // camera.updateProjectionMatrix();
        // console.log(
        // camera.near,
        // camera.far,
        // )
        // console.log(camera.far, "far")
        // console.log(camera.near, "near")
        helper.matrix = camera.matrixWorld
        helper.update()
        this.instance.notifyChange(helper, {
          needsRedraw: true,
          immediate: true,
        })
      })
    ).subscribe()
  }

  /**
   * OL geometry to giro 3D Extent 
   * @param ol_geometry 
   * @returns 
   */
  static olGeometryToGiroExtent(ol_geometry: Geometry): Extent {

    let ol_extent = buffer(ol_geometry.getExtent(), ol_geometry.getType() == "Point" ? 20 : 20)
    let ol_extent_center = getCenter(ol_extent)

    return Extent.fromCenterAndSize('EPSG:3857', { x: ol_extent_center[0], y: ol_extent_center[1] }, ol_extent[2] - ol_extent[0], ol_extent[3] - ol_extent[1])

  }
  /**
   * Move layer on top of the map
   * @param layer 
   */
  moveLayerOnTop(layer: ColorLayer) {
    if (this.map.getIndex(layer) != undefined) {
      let level: number = this.map.getIndex(layer)
      while (level < this.map.getLayers().length) {
        this.map.moveLayerUp(layer)
        level += 1
      }
    }
  }

  static getZAndMapWith(map: MapGiro3d, camera: PerspectiveCamera, controls: OrbitControls) {
    const focalLength = camera.position.distanceTo(controls.target);
    const fov = camera.fov * (Math.PI / 180);
    const aspect = camera.aspect;

    const heightNear = 2 * Math.tan(fov / 2) * focalLength;
    const mapWith = heightNear * aspect;

    const instance: Instance = map["_instance"]
    const tileGrid = createXYZ({ tileSize: 512 })
    let target_resolution = mapWith / instance.domElement.width

    // Compute Z of the map
    const z = tileGrid.getZForResolution(
      target_resolution
    );
    // console.log(z)
    return [z, mapWith]
  }


}

export const resetZCoordinatesGeoJSON = new GeoJSON()

resetZCoordinatesGeoJSON.readFeatures = function (source, opt_options) {

  function getObject(source) {
    if (typeof source === 'string') {
      const object = JSON.parse(source);
      return object ? /** @type {Object} */ (object) : null;
    } else if (source !== null) {
      return source;
    } else {
      return null;
    }
  }

  var resetZCoordinates = function (arr) {
    if (arr instanceof Array) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].length == 3 && arr[i][0] instanceof Array == false) {
          arr[i] = [arr[i][0], arr[i][1], 5]
        } else {
          resetZCoordinates(arr[i]);
        }
      }
    }
    return arr
  }

  let object_json = getObject(source)
  for (let index = 0; index < object_json.features.length; index++) {
    const element = object_json.features[index];
    element.geometry.coordinates = resetZCoordinates(element.geometry.coordinates)
  }

  // console.log(object_json)
  return this.prototype.readFeaturesFromObject(
    object_json,
    this.prototype.getReadOptions(source, opt_options)
  );
}.bind(GeoJSON);

// export class CustomFeatureCollection extends FeatureCollection {

//   update = function (ctx: Context, tile) {

//     function setNodeContentVisible(node, visible) {
//       for (const child of node.children) {
//         // hide the content of the tile without hiding potential children tile's content
//         if (!child.userData.isTile) {
//           child.visible = visible;
//         }
//       }
//     }

//     if (!tile.parent) {
//       // if node has been removed dispose three.js resource
//       for (const child of tile.children) {
//         // I want to exclude null or undefined, but include 0
//         if (!child.userData.isTile && child.userData.id != null) {
//           this._tileIdSet.delete(child.userData.id);
//         }
//       }

//       tile.dispose();
//       this._cachedMemoryUsage = null;

//       return null;
//     }

//     // initialisation
//     if (tile.userData.layerUpdateState == null) {
//       tile.userData.layerUpdateState = new LayerUpdateState();
//     }

//     // Are we visible ?
//     if (!this.frozen) {
//       const isVisible = ctx.camera.isBox3Visible(tile.userData.boundingBox, tile.matrixWorld);
//       tile.visible = isVisible;
//     }

//     // if not visible we can stop early
//     if (!tile.visible) {
//       const toCleanup = [];
//       for (const child of tile.children) {
//         tile.remove(child);
//         // let's tell the MainLoop about subtiles that need cleaning
//         if (child.userData.isTile) {
//           toCleanup.push(child);
//         }
//       }
//       return toCleanup;
//     }

//     // if we have children that are real data, update min and max distance
//     if (tile.children.filter((c: Mesh | Line | Points) => c.geometry != null).length > 0) {
//       this.updateMinMaxDistance(ctx.distance.plane, tile);
//     }

//     // Do we need stuff for ourselves?
//     const ts = Date.now();

//     // we are in the z range and we can try an update
//     // && tile.userData.layerUpdateState.canTryUpdate(ts)
//     if (
//       tile.userData.z <= this.maxLevel &&
//       tile.userData.z >= this.minLevel
//     ) {
//       tile.userData.layerUpdateState.newTry();

//       this._opCounter.increment();

//       this.getMeshesWithCache(tile)
//         .then(meshes => {
//           // if request return empty json, result will be null
//           if (meshes) {
//             if (
//               tile.children.filter(
//                 n => n.userData.parentEntity === this && !n.userData.isTile,
//               ).length > 0
//             ) {
//               // console.warn(
//               //   `We received results for this tile: ${tile},` +
//               //   'but it already contains children for the current entity.',
//               // );
//             }

//             for (const mesh of meshes) {
//               if (
//                 !this._tileIdSet.has(mesh.userData.id) ||
//                 // exclude null or undefined, but keep 0
//                 /* eslint-disable-next-line eqeqeq */
//                 mesh.userData.id == null || !tile.children.find((child) => child.userData.id == mesh.userData.id)
//               ) {
//                 this._tileIdSet.add(mesh.userData.id);
//                 tile.add(mesh);
//                 tile.userData.boundingBox.expandByObject(mesh);
//                 this._instance.notifyChange(tile);
//               }
//             }
//             // tile.userData.layerUpdateState.noMoreUpdatePossible();
//           } else {
//             tile.userData.layerUpdateState.failure(1, true);
//           }
//         })
//         .catch(err => {
//           // Abort errors are perfectly normal, so we don't need to log them.
//           // However any other error implies an abnormal termination of the processing.
//           if (err?.name === 'AbortError') {
//             // the query has been aborted because Giro3D thinks it doesn't need this any
//             // more, so we put back the state to IDLE
//             tile.userData.layerUpdateState.success();
//           } else {
//             console.error(err);
//             tile.userData.layerUpdateState.failure(Date.now(), true);
//           }
//         })
//         .finally(() => {
//           this._cachedMemoryUsage = null;
//           this._opCounter.decrement();
//         });
//     }

//     // Do we need children ?
//     let requestChildrenUpdate = false;

//     if (!this.frozen) {
//       const s = tile.userData.boundingBox.getSize(new Vector3());
//       const sse = ScreenSpaceError.computeFromBox3(
//         ctx.camera,
//         tile.userData.boundingBox,
//         tile.matrixWorld,
//         Math.max(s.x, s.y),
//         ScreenSpaceError.Mode.MODE_2D,
//       );

//       tile.userData.sse = sse; // DEBUG

//       if (this.testTileSSE(tile, sse)) {
//         this.subdivideNode(ctx, tile);
//         setNodeContentVisible(tile, false);
//         requestChildrenUpdate = true;
//       } else {
//         setNodeContentVisible(tile, true);
//       }
//     } else {
//       requestChildrenUpdate = true;
//     }

//     // TODO fix memory leak when detaching tiles (geometries are not always disposed).

//     // update uniforms
//     if (!requestChildrenUpdate) {
//       const toClean = [];
//       for (const child of tile.children.filter(c => c.userData.isTile)) {
//         tile.remove(child);
//         toClean.push(child);
//       }
//       return toClean;
//     }

//     return requestChildrenUpdate
//       ? tile.children.filter(n => n.userData.parentEntity === this)
//       : undefined;
//   }

// }


export class VectorSourceExtentEvent extends VectorSourceEvent {
  extent: OLExtent

  constructor(type, opt_feature, opt_features, extent: OLExtent) {
    super(type, opt_feature, opt_features);

    this.extent = extent;

  }
}

export class CustomVectorSource extends VectorSource {
  _tileLoaded: Map<string, boolean> = new Map<string, boolean>()

  tileGrid = createXYZ({ tileSize: 512 * 4 })

  getTileCoordFromExtent(extent, resolution) {

    const tilesCoord: TileCoord[] = []
    const z = this.tileGrid.getZForResolution(
      resolution
    );
    this.tileGrid.forEachTileCoord(extent, z, (tileCoord) => {
      tilesCoord.push(tileCoord)
      // const gridExtent = tileGrid.getTileCoordExtent(tileCoord)
    })
    return tilesCoord

  }

  // getExtents(extent, resolution, projection) {
  //   const tileGrid = createXYZ({ tileSize: 512 })
  //   const z = tileGrid.getZForResolution(
  //     resolution
  //   );
  //   const tileRange = tileGrid.getTileRangeForExtentAndZ(
  //     fromUserExtent(extent, projection),
  //     z
  //   );
  //   /** @type {Array<import("./extent.js").Extent>} */
  //   const extents: Array<OLExtent> = [];
  //   /** @type {import("./tilecoord.js").TileCoord} */
  //   const tileCoord = [z, 0, 0];
  //   for (
  //     tileCoord[1] = tileRange.minX;
  //     tileCoord[1] <= tileRange.maxX;
  //     ++tileCoord[1]
  //   ) {
  //     for (
  //       tileCoord[2] = tileRange.minY;
  //       tileCoord[2] <= tileRange.maxY;
  //       ++tileCoord[2]
  //     ) {
  //       extents.push(
  //         toUserExtent(tileGrid.getTileCoordExtent(tileCoord), projection)
  //       );
  //     }
  //   }
  //   return extents;
  // }

  isExtentLoad = function (extent: OLExtent) {
    return this._tileLoaded.has(extent.join("_"))

  }

  tilesCoordToExtent(tilesCoord: TileCoord[], projection) {
    return tilesCoord.map((tileCoord) => toUserExtent(this.tileGrid.getTileCoordExtent(tileCoord), projection))
  }


  /**
  * @param {import("../extent.js").Extent} extent Extent.
  * @param {number} resolution Resolution.
  * @param {import("../proj/Projection.js").default} projection Projection.
  */
  loadFeatures = function (extent, resolution, projection) {
    const loadedExtentsRtree = this.loadedExtentsRtree_;

    const tilesCoords = this.getTileCoordFromExtent(extent, resolution)
    const extentsToLoad = this.tilesCoordToExtent(tilesCoords, projection).filter(extent => !this.isExtentLoad(extent))


    for (let i = 0, ii = extentsToLoad.length; i < ii; ++i) {
      const extentToLoad = extentsToLoad[i];
      // const alreadyLoaded = loadedExtentsRtree.forEachInExtent(
      //   extentToLoad,
      //   /**
      //    * @param {{extent: import("../extent.js").Extent}} object Object.
      //    * @return {boolean} Contains.
      //    */
      //   function (object) {
      //     return containsExtent(object.extent, extentToLoad);
      //   }
      // );
      // if (!alreadyLoaded) {
      ++this.loadingExtentsCount_;
      this.dispatchEvent(
        new VectorSourceEvent(VectorEventType.FEATURESLOADSTART)
      );
      this.loader_.call(
        this,
        extentToLoad,
        resolution,
        projection,
        function (features) {
          --this.loadingExtentsCount_;

          this.dispatchEvent(
            new VectorSourceExtentEvent(
              VectorEventType.FEATURESLOADEND,
              undefined,
              features,
              extentToLoad
            )
          );
        }.bind(this),
        function () {
          --this.loadingExtentsCount_;

          this.dispatchEvent(
            new VectorSourceExtentEvent(VectorEventType.FEATURESLOADERROR, undefined, undefined, extentToLoad)
          );
        }.bind(this)
      );

      // }
      this._tileLoaded.set(extentToLoad.join("_"), true)
      loadedExtentsRtree.insert(extentToLoad, { extent: extentToLoad.slice() });
    }
    this.loading =
      this.loader_.length < 4 ? false : this.loadingExtentsCount_ > 0;
  }

  /**
   * Get the closest feature to the provided coordinate. And specify a max distance
   *
   * This method is not available when the source is configured with
   * `useSpatialIndex` set to `false`.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @param {function(import("../Feature.js").default<Geometry>):boolean} [opt_filter] Feature filter function.
   *     The filter function will receive one argument, the {@link module:ol/Feature~Feature feature}
   *     and it should return a boolean value. By default, no filtering is made.
   * @return {import("../Feature.js").default<Geometry>} Closest feature.
   * @api
   */
  getClosestFeatureToCoordinateLimitByDistance = function (coordinate, minDistance = 100, opt_filter?) {
    // Find the closest feature using branch and bound.  We start searching an
    // infinite extent, and find the distance from the first feature found.  This
    // becomes the closest feature.  We then compute a smaller extent which any
    // closer feature must intersect.  We continue searching with this smaller
    // extent, trying to find a closer feature.  Every time we find a closer
    // feature, we update the extent being searched so that any even closer
    // feature must intersect it.  We continue until we run out of features.
    const x = coordinate[0];
    const y = coordinate[1];
    let closestFeature = null;
    const closestPoint = [NaN, NaN];
    let minSquaredDistance = Infinity;
    const minSquaredDistanceList = []
    const extent = [-Infinity, -Infinity, Infinity, Infinity];
    extent[0] = x - minDistance;
    extent[1] = y - minDistance;
    extent[2] = x + minDistance;
    extent[3] = y + minDistance;

    const filter = opt_filter ? opt_filter : TRUE;
    this.featuresRtree_.forEachInExtent(
      extent,
      /**
       * @param {import("../Feature.js").default<Geometry>} feature Feature.
       */
      function (feature) {
        if (filter(feature)) {
          const geometry = feature.getGeometry();
          const previousMinSquaredDistance = minSquaredDistance;
          minSquaredDistance = geometry.closestPointXY(
            x,
            y,
            closestPoint,
            minSquaredDistance
          );

          if (minSquaredDistance < previousMinSquaredDistance) {
            closestFeature = feature;
            // This is sneaky.  Reduce the extent that it is currently being
            // searched while the R-Tree traversal using this same extent object
            // is still in progress.  This is safe because the new extent is
            // strictly contained by the old extent.
            const minDistance = Math.sqrt(minSquaredDistance);

            extent[0] = x - minDistance;
            extent[1] = y - minDistance;
            extent[2] = x + minDistance;
            extent[3] = y + minDistance;
          }
        }
      }
    );
    return closestFeature;
  }
}

export function getAllFeaturesInVectorTileSource(vectorTileSource: VectorTileSource) {

  let features = [];
  // @ts-expect-error
  const tileCache = vectorTileSource.tileCache;
  if (tileCache.getCount() === 0) {
    return features;
  }
  const z = fromKey(tileCache.peekFirstKey())[0];
  const tileGrid = vectorTileSource.tileGrid;

  tileCache.forEach(function (tile) {
    features = features.concat(getFeaturesFromTileCoord(tile, z))

    //   if (tile.tileCoord[0] !== z || tile.getState() !== TileState.LOADED) {
    //     return;
    //   }
    //   const sourceTiles = tile.getSourceTiles();
    //   for (let i = 0, ii = sourceTiles.length; i < ii; ++i) {
    //     const sourceTile = sourceTiles[i];
    //     const tileCoord = sourceTile.tileCoord;
    //     // if (intersects(extent, tileGrid.getTileCoordExtent(tileCoord))) {
    //     const tileFeatures = sourceTile.getFeatures();
    //     if (tileFeatures) {
    //       for (let j = 0, jj = tileFeatures.length; j < jj; ++j) {
    //         const candidate = tileFeatures[j];
    //         const geometry = candidate.getGeometry();
    //         // if (intersects(extent, geometry.getExtent())) {
    //         features.push(candidate);
    //         // }
    //       }
    //     }
    //     // }
    //   }
    // }
  });
  return features;
}

export function getFeaturesFromTileCoord(tile: VectorRenderTile, z: number) {
  const features: FeatureLike[] = []
  if (tile.tileCoord[0] !== z || tile.getState() !== TileState.LOADED) {
    return features;
  }
  const sourceTiles = tile.getSourceTiles();
  for (let i = 0, ii = sourceTiles.length; i < ii; ++i) {
    const sourceTile = sourceTiles[i];
    const tileCoord = sourceTile.tileCoord;
    // if (intersects(extent, tileGrid.getTileCoordExtent(tileCoord))) {
    const tileFeatures = sourceTile.getFeatures();
    if (tileFeatures) {
      for (let j = 0, jj = tileFeatures.length; j < jj; ++j) {
        const candidate = tileFeatures[j];
        const geometry = candidate.getGeometry();
        // return candidate
        // if (intersects(extent, geometry.getExtent())) {
        features.push(candidate);
        // }
      }
    }
    // }
  }
  return features;
}
