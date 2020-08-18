import { Injectable } from '@angular/core';
import { GeosmLayersServiceService } from '../geosm-layers-service/geosm-layers-service.service'
import { StorageServiceService } from '../storage-service/storage-service.service'
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
    public StorageServiceService: StorageServiceService
  ) { }

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
