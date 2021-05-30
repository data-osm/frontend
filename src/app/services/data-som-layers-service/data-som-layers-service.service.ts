import { Injectable } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { CartoHelper, DataOSMLayer } from '../../../helper/carto.helper';
import { Map } from 'ol';
import { environment } from '../../../environments/environment';
import { BaseMap } from '../../data/models/base-maps';
import { Layer, Group, LayerProviders } from '../../type/type';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

@Injectable({
  providedIn: 'root'
})
export class DataOsmLayersServiceService {

  public getLayerInMap :(layer_id:number) =>{group:Group,layer:Layer}
  public storeLayer : (group:Group,layer:Layer)=>void
  public destroyLayer : (layer_id:number)=>void

  public getBasemap :(id:number)=>BaseMap

  private readonly notifier: NotifierService;

  public baseMaps:BehaviorSubject<Array<BaseMap>> = new BehaviorSubject<Array<BaseMap>>([])
  public groupsLayerInMap:BehaviorSubject<Array<{
    group:Group,
    layer:Layer
  }>> = new BehaviorSubject<Array<{
    group:Group,
    layer:Layer
  }>>([])

  constructor(
    notifierService: NotifierService,
  ) {
    this.notifier = notifierService;

    this.getBasemap = (id:number):BaseMap =>{
      return this.baseMaps.getValue().find((basemap)=>basemap.id == id)
    }

    this.getLayerInMap = (layer_id:number):{group:Group,layer:Layer} =>{
      return this.groupsLayerInMap.getValue().find((groupLayer)=>groupLayer.layer.layer_id == layer_id)
    }

    this.destroyLayer = (layer_id:number)=>{
      let groupLayers=  this.groupsLayerInMap.getValue().filter((groupLayer)=>groupLayer.layer.layer_id != layer_id)
      this.groupsLayerInMap.next(groupLayers)
    }

    this.storeLayer = (group:Group,layer:Layer)=>{
      if (!this.getLayerInMap(layer.layer_id)) {
        let groupLayers =  this.groupsLayerInMap.getValue()
        groupLayers.push({group:group,layer:layer})
        this.groupsLayerInMap.next(groupLayers)
      }
    }

  }

  /**
 * Remove layer of type 'couche' in map
 * @param layer Layer
 */
  removeLayer(layer_id: number, map:Map) {
    let layers = new CartoHelper(map).getLayerByPropertiesCatalogueGeosm({
      couche_id: layer_id,
      type: 'couche'
    })

    while (layers.length > 0) {
      new CartoHelper(map).removeLayerToMap(layers[0])
      
      layers = new CartoHelper(map).getLayerByPropertiesCatalogueGeosm({
        couche_id: layer_id,
        type: 'couche'
      })
    }
    console.log(layer_id)
    this.destroyLayer(layer_id)
  }

  /**
 * Recuperer les dimensions d'une image a partir de son lien
 * @param urlImage string url of the image
 * @return (dimenions:{width:number,height:number}) => void
 */
  geDimensionsOfImage(urlImage: string, callBack: (dimenions: { width: number, height: number }) => void) {
    try {
      var img = new Image();
      img.onload = function () {
        callBack({ width: img.width, height: img.height });
      };
      img.src = urlImage;
    } catch (error) {
      callBack(undefined)
    }

  }

  /**
   * Add layer of type 'couche' to map
   * @param couche Layer
   */

  addLayer(layer: Layer, map:Map, group:Group) {
    let cartoHelperClass = new CartoHelper(map)
    let isLayerInMap = new CartoHelper(map).getLayerByPropertiesCatalogueGeosm({
      couche_id: layer.layer_id,
      type: 'couche'
    }).length > 0 

    if (isLayerInMap) {
      this.notifier.notify("error", "This layer already exist in the map");
      throw new Error("his layer already exist in the map");
    } else if (layer.providers.length == 0) {
      this.notifier.notify("error", "This layer have no providers");
      throw new Error("his layer have no providers");
    } else {
      this.storeLayer(group,layer)
      
      this.geDimensionsOfImage(environment.backend  + layer.square_icon, (dimension: { width: number, height: number }) => {
        if (dimension == undefined)  {
          this.removeLayer(layer.layer_id, map)
        }
        let size = 0.4

        if (dimension) {
          size = 40 / dimension.width
        }

        var pathImg = layer.square_icon

        layer.providers
        .filter((provider)=>provider.vp.state =='good')
        .map((provider)=>{
          
          let layerOl = cartoHelperClass.constructLayer({
            nom: layer.name,
            type: 'wms',
            identifiant: [provider.vp.id_server],
            type_layer: 'geosmCatalogue',
            url: environment.url_carto+provider.vp.url_server,
            visible: true,
            inToc: true,
            properties: {
              couche_id: layer.layer_id,
              type: 'couche'
            },
            iconImagette: environment.backend +  pathImg,
            icon: environment.backend +  pathImg,
            cluster: true,
            size: size,
            legendCapabilities: [],
            styleWMS:[provider.vs.name],
            descriptionSheetCapabilities: 'osm'
          })

          cartoHelperClass.addLayerToMap(layerOl)
          
        })


      })
    }

  }

  /**
  * Remove layer of type 'carte' in map
  * @param baseMap BaseMap
  */
  removeBaseMap(id: number, map:Map) {

    let layer = new CartoHelper(map).getLayerByPropertiesCatalogueGeosm({
      couche_id: id,
      type: 'carte'
    })
    
    while (layer.length > 0) {
      new CartoHelper(map).removeLayerToMap(layer[0])
      
      layer = new CartoHelper(map).getLayerByPropertiesCatalogueGeosm({
        couche_id: id,
        type: 'carte'
      })
    }

  }

  /**
   * Add layer of type 'carte' to map
   * @param baseMap BaseMap
   */
  addBaseMap(baseMap: BaseMap, map:Map) {
    var type;
    if (baseMap.protocol_carto == 'wms') {
      type = 'wms'
    } else if (baseMap.protocol_carto == 'wmts') {
      type = 'xyz'
    }

    let dataOsmLayer:DataOSMLayer = {
      nom: baseMap.name,
      type: type,
      type_layer: 'geosmCatalogue',
      url: baseMap.url,
      visible: true,
      inToc:true,
      properties: {
        couche_id: baseMap.id,
        type: 'carte',
      },
      tocCapabilities:{
        share:false,
        metadata:true,
        opacity:true
      },
      iconImagette: environment.backend + baseMap.pictogramme.raster_icon,
      descriptionSheetCapabilities:undefined
    }

    if (type == 'wms') {
      dataOsmLayer.identifiant = [baseMap.identifiant]
    }

    let layer = new CartoHelper(map).constructLayer(dataOsmLayer )
    new CartoHelper(map).addLayerToMap(layer)

  }

}
