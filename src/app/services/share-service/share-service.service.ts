import { Injectable } from '@angular/core';
import { GeosmLayersServiceService } from '../geosm-layers-service/geosm-layers-service.service'
import { StorageServiceService } from '../storage-service/storage-service.service'
import { BackendApiService } from '../backend-api/backend-api.service'
import { manageCompHelper } from 'src/helper/manage-comp.helper'
import { cartoHelper, layersInMap } from '../../../helper/carto.helper'
import { Point, VectorLayer, Cluster, Feature, GeoJSON, Transform } from '../../../app/ol-module';
import { parse } from '@fortawesome/fontawesome-svg-core';
import { coucheInterface } from 'src/app/type/type';
import * as $ from 'jquery'

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
    public manageCompHelper: manageCompHelper,
    public BackendApiService: BackendApiService
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
  displayFeatureShared(parametersShared: Array<any>) {

    for (let index = 0; index < parametersShared.length; index++) {
      const parameterOneFeature = parametersShared[index].split(',');
      if (parameterOneFeature.length == 6) {

        var group_id = parseInt(parameterOneFeature[2]),
          couche_id = parseInt(parameterOneFeature[1]),
          type = parameterOneFeature[0],
          id = parameterOneFeature[5]
        this.addLayersFromUrl([
          type + "," +
          couche_id + "," +
          group_id + ","
        ])

        var cartoClass = new cartoHelper()


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

            var couche: coucheInterface = this.StorageServiceService.getCouche(group_id, couche_id)

            this.getFeatureOSMFromCartoServer(couche, id).then(
              (feature) => {
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
              }
            )

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
    return this.BackendApiService.getRequestFromOtherHost(url).then(
      (response) => {
        var features = new GeoJSON().readFeatures(response, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        if (features.length == 1) {
          return features[0]
        } else {
          return
        }
      },
      (err) => {
        return
      }
    )
  }

  // http://tiles.geosm.org/ows/?map=france/france10.qgs&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=Histoire&GEOMETRYNAME=null&EXP_FILTER=osm_id=7816986187
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
   * Zoom to the position in URL
   * @param number lon
   * @param number lat
   * @param number z the zoom
   */
  zoomToSharePos(lon: Number, lat: Number, z:Number) {

    var shareCenter = [lon, lat]
    var geom = new Point(Transform(shareCenter, 'EPSG:4326', 'EPSG:3857'))
    setTimeout(() => {
      new cartoHelper().fit_view(geom, z)
    }, 2000);
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
            let groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(carte.key_couche)
            if (groupCarte) {
              this.manageCompHelper.openGroupCarteSlide(groupCarte)
            }
          }
        } else if (type == 'couche') {
          var couche = this.StorageServiceService.getCouche(parseInt(element[2]), parseInt(element[1]))
          if (couche) {
            this.GeosmLayersServiceService.addLayerCouche(couche)
            let groupThem = this.StorageServiceService.getGroupThematiqueFromIdCouche(couche.key_couche)
            if (groupThem) {
              this.manageCompHelper.openGroupThematiqueSlide(groupThem)
              setTimeout(() => {
                try {
                  $('#couche_'+couche.key_couche)[0].scrollIntoView(false);
                } catch (error) {
                }
              }, 1000);
            }
          }
        }
      } catch (error) {

      }
    }
  }

}
