import { Injectable } from '@angular/core';
import { GeosmLayersServiceService } from '../geosm-layers-service/geosm-layers-service.service'
import { StorageServiceService } from '../storage-service/storage-service.service'
import { manageCompHelper } from 'src/helper/manage-comp.helper'
import { cartoHelper } from 'src/helper/carto.helper'
import { Point, VectorLayer, Cluster } from 'src/app/ol-module';
import { parse } from '@fortawesome/fontawesome-svg-core';
@Injectable({
  providedIn: 'root'
})
/**
 * Service to handle share features:
 * - Generate link to share
 * - Parse parameters of a link
 */
export class ShareServiceService {

  constructor(
    public GeosmLayersServiceService: GeosmLayersServiceService,
    public StorageServiceService: StorageServiceService,
    public manageCompHelper: manageCompHelper
  ) { }

  /**
   * get parameters to share one feature of a layer
   * @param 'carte'|'couche' typeLayer type of the layer
   * @param number id_layer id of the layer in DB (key_couche)
   * @param number group_id if of the group layer in BD (id_thematique, id_carte)
   * @param coordinates [number,number] coordinates on the geometry of the feature
   * @param featureId number id of the feature (the value returned by feature.getId())
   */
  shareFeature(typeLayer: 'carte' | 'couche', id_layer: number, group_id: number, coordinates: [number, number],featureId:number): string {
    return 'feature=' + typeLayer + ',' + id_layer + ',' + group_id + ',' + coordinates.join(',')+','+featureId
  }

  /**
   * Display feature shared in link of the app
   * @param parametersShared
   */
  displayFeatureShared(parametersShared: Array<any>) {

    for (let index = 0; index < parametersShared.length; index++) {
      const parameterOneFeature = parametersShared[index].split(',');
      if (parameterOneFeature.length == 6) {
        this.addLayersFromUrl([
          parameterOneFeature[0]+","+
          parameterOneFeature[1]+","+
          parameterOneFeature[2]+","
        ])

        var cartoClass = new cartoHelper()
        var geom = new Point([parseFloat(parameterOneFeature[3]), parseFloat(parameterOneFeature[4])])

        setTimeout(()=>{
          cartoClass.fit_view(geom, 12)
        },1000)

        setTimeout(() => {
          var layer = cartoClass.getLayerByPropertiesCatalogueGeosm({
            group_id: parseInt(parameterOneFeature[2]),
            couche_id: parseInt(parameterOneFeature[1]),
            type: parameterOneFeature[0],
          })
          var tries = 0
          while (tries < 5 && layer.length == 0) {
            tries++
            layer = cartoClass.getLayerByPropertiesCatalogueGeosm({
              group_id: parseInt(parameterOneFeature[2]),
              couche_id: parseInt(parameterOneFeature[1]),
              type: parameterOneFeature[0],
            })
          }

          if (layer.length > 0) {
            if (layer[0] instanceof VectorLayer ) {
              var source = layer[0].getSource()
              if (layer[0].getSource() instanceof Cluster) {
                source = source.getSource()
              }
              var feature = source.getFeatureById(parameterOneFeature[5])
              if (feature) {
                var propertie = feature.getProperties()
                var geometry = feature.getGeometry()
                this.manageCompHelper.openDescriptiveSheet(
                  layer[0].get('descriptionSheetCapabilities'),
                  cartoClass.constructAlyerInMap(layer[0]),
                  [parseFloat(parameterOneFeature[3]), parseFloat(parameterOneFeature[4])],
                  geometry,
                  propertie
                )
              }
            }else{
              this.manageCompHelper.openDescriptiveSheet(
                layer[0].get('descriptionSheetCapabilities'),
                cartoClass.constructAlyerInMap(layer[0]),
                [parseFloat(parameterOneFeature[3]), parseFloat(parameterOneFeature[4])]
              )
            }
          }

        }, 5000);

      }
    }
  }

  /**
   * get parameters to share one layer
   * @param 'carte'|'couche' typeLayer type of the layer
   * @param number id_layer id of the layer in DB (key_couche)
   * @param number group_id if of the group layer in BD (id_thematique, id_carte)
   * @return string
   */
  shareLayer(typeLayer: 'carte' | 'couche', id_layer: number, group_id: number): string {
    return 'layers=' + typeLayer + ',' + id_layer + ',' + group_id
  }

  /**
   * get parameters to share multiple layer
   * @param {
   *  typeLayer:'carte'|'couche
   *  id_layer:number
   *  group_id:number
   * } layers type of the layer
   * @return string
   */
  shareLayers(layers: Array<{ typeLayer: 'carte' | 'couche', id_layer: number, group_id: number }>): string {
    var parameters = []
    for (let index = 0; index < layers.length; index++) {
      parameters.push(layers[index].typeLayer + ',' + layers[index].id_layer + ',' + layers[index].group_id)
    }
    return 'layers=' + parameters.join(';')
  }

  /**
   * Add layers from parameters of the url
   * @param Array<string> layers
   * @example of the params layers [carte,39,1] carte is the type of layer, 39 the id_layer and 1 the group_id
   */
  addLayersFromUrl(layers: Array<string>) {
    for (let index = 0; index < layers.length; index++) {
      const element = layers[index].split(',');
      try {
        var type = element[0]
        if (type == 'carte') {
          var carte = this.StorageServiceService.getCarte(parseInt(element[2]), parseInt(element[1]))
          if (carte) {
            this.GeosmLayersServiceService.addLayerCarte(carte)
          }
        } else if (type == 'couche') {
          var couche = this.StorageServiceService.getCouche(parseInt(element[2]), parseInt(element[1]))
          if (couche) {
            this.GeosmLayersServiceService.addLayerCouche(couche)
          }
        }
      } catch (error) {

      }
    }
  }

}
