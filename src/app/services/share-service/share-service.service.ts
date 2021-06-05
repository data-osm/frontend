import { Injectable } from '@angular/core';
import { DataOsmLayersServiceService } from '../data-som-layers-service/data-som-layers-service.service'
import { BackendApiService } from '../backend-api/backend-api.service'
import { CartoHelper, layersInMap } from '../../../helper/carto.helper'
import { Point, VectorLayer, Cluster, Feature, GeoJSON, Transform, Coordinate, Map } from '../../../app/ol-module';
import { parse } from '@fortawesome/fontawesome-svg-core';
import * as $ from 'jquery'
import { coucheInterface } from '../../type/type';
import { ManageCompHelper } from '../../../helper/manage-comp.helper';
import { ParametersService } from '../../data/services/parameters.service';

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
    public parametersService: ParametersService,
    public backendApiService: BackendApiService,
    public manageCompHelper: ManageCompHelper
  ) { }

  /**
   * get parameters to share one feature of a layer
   * @param 'carte'|'couche' typeLayer type of the layer
   * @param number id_layer id of the layer in DB (key_couche)
   * @param number group_id if of the group layer in BD (id_thematique, id_carte)
   * @param coordinates [number,number] coordinates on the geometry of the feature
   * @param featureId number id of the feature (the value returned by feature.getId())
   */
  shareFeature(typeLayer: 'carte' | 'couche', id_layer: number, group_id: number, coordinates: [number, number], featureId: number): string {
    return 'feature=' + typeLayer + ',' + id_layer + ',' + group_id + ',' + coordinates.join(',') + ',' + featureId
  }

  /**
   * Display feature shared in link of the app
   * @param parametersShared
   */
  displayFeatureShared(parametersShared: Array<any>, map:Map) {

    for (let index = 0; index < parametersShared.length; index++) {
      const parameterOneFeature = parametersShared[index].split(',');
      if (parameterOneFeature.length == 6) {

        var group_id = parseInt(parameterOneFeature[2]),
          couche_id = parseInt(parameterOneFeature[1]),
          type = parameterOneFeature[0],
          id = parameterOneFeature[5]
        // this.addLayersFromUrl([
        //   type + "," +
        //   couche_id + "," +
        //   group_id + ",",
        // ], map)

        var cartoClass = new CartoHelper(map)


        setTimeout(() => {
          var layer = cartoClass.getLayerByPropertiesCatalogueGeosm({
            group_id: group_id,
            couche_id: couche_id,
            type: type,
          })
          var tries = 0
          while (tries < 5 && layer.length == 0) {
            tries++
            layer = cartoClass.getLayerByPropertiesCatalogueGeosm({
              group_id: group_id,
              couche_id: couche_id,
              type: type,
            })
          }

          var geom = new Point([parseFloat(parameterOneFeature[3]), parseFloat(parameterOneFeature[4])])
          cartoClass.fit_view(geom, 12)

          if (layer.length > 0) {

            // var couche: coucheInterface = this.StorageServiceService.getCouche(group_id, couche_id)

            // this.getFeatureOSMFromCartoServer(couche, id).then(
            //   (feature) => {
            //     if (feature) {
            //       var propertie = feature.getProperties()
            //       var geometry = feature.getGeometry()
            //       // this.manageCompHelper.openDescriptiveSheet(
            //       //   layer[0].get('descriptionSheetCapabilities'),
            //       //   cartoClass.constructAlyerInMap(layer[0]),
            //       //   [parseFloat(parameterOneFeature[3]), parseFloat(parameterOneFeature[4])],
            //       //   map,
            //       //   geometry,
            //       //   propertie
            //       // )
            //     }
            //   }
            // )

          }

        }, 3000);

      }
    }
  }

  /**
   * Fecth feature of type osm in carto server
   * We use a WFS request with filter base on osm_id
   * @param couche coucheInterface
   * @param osmId number
   * @return Feature
   */
  getFeatureOSMFromCartoServer(couche: coucheInterface, osmId: number): Promise<Feature> {
    var url = couche.url + '&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=' + couche.identifiant + '&EXP_FILTER=osm_id=' + osmId;
    
    return this.backendApiService.getRequestFromOtherHost(url).then(
      (response) => {
        var features = new GeoJSON().readFeatures(response, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        if (features.length == 1) {
          return features[0]
        } else {
          return undefined
        }
      },
      (err) => {
        return undefined
      }
    )
  }

  // http://tiles.geosm.org/ows/?map=france/france10.qgs&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=Histoire&GEOMETRYNAME=null&EXP_FILTER=osm_id=7816986187
  /**
   * get parameters to share one layer
   * @param number id_layer id of the layer
   * @return string
   */
  shareLayer(id_layer: number, group_id:number): string {
    
    return 'profil='+this.parametersService.map_id+'&layers='+ id_layer+ ',' + group_id
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
  shareLayers(layers: Array<{id_layer: number, group_id:number}>): string {
    return 'profil='+this.parametersService.map_id+'&layers=' + layers.map((item)=>item.id_layer+','+item.group_id).join(';')
  }


}
