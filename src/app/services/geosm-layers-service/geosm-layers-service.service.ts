import { Injectable } from '@angular/core';
import { coucheInterface, carteInterface } from 'src/app/type/type';
import { cartoHelper } from 'src/helper/carto.helper';
import { environment } from 'src/environments/environment';
import { StorageServiceService } from '../storage-service/storage-service.service'
import { NotifierService } from 'angular-notifier';

@Injectable({
  providedIn: 'root'
})
export class GeosmLayersServiceService {

  private readonly notifier: NotifierService;

  constructor(
    public StorageServiceService: StorageServiceService,
    notifierService: NotifierService,
  ) {
    this.notifier = notifierService;
  }

  /**
 * Remove layer of type 'couche' in map
 * @param couche coucheInterface
 */
  removeLayerCouche(couche: coucheInterface) {
    var groupThematique = this.StorageServiceService.getGroupThematiqueFromIdCouche(couche.key_couche)

    let cartoHelperClass = new cartoHelper()

    var layer = cartoHelperClass.getLayerByPropertiesCatalogueGeosm({
      group_id: groupThematique.id_thematique,
      couche_id: couche.key_couche,
      type: 'couche'
    })
    for (let index = 0; index < layer.length; index++) {
      cartoHelperClass.removeLayerToMap(layer[index])
      couche.check = false
    }

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
      callBack(null)
    }

  }

  /**
   * Add layer of type 'couche' to map
   * @param couche coucheInterface
   */

  addLayerCouche(couche: coucheInterface) {
    let cartoHelperClass = new cartoHelper()
    var groupThematique = this.StorageServiceService.getGroupThematiqueFromIdCouche(couche.key_couche)
    if (cartoHelperClass.getLayerByName(couche.nom).length > 0) {
      this.notifier.notify("error", "Cette couche est déja ajoutée à la carte");
    } else {
      this.geDimensionsOfImage(environment.url_prefix + '/' + couche.img, (dimension: { width: number, height: number }) => {

        let size = 0.4

        if (dimension) {
          size = 40 / dimension.width
        }

        var pathImg = couche.logo_src ? couche.logo_src : couche.img
        var layer = cartoHelperClass.constructLayer({
          nom: couche.nom,
          type: couche.service_wms == false ? 'wfs' : couche.type_couche,
          identifiant: couche.identifiant,
          type_layer: 'geosmCatalogue',
          url: couche.url,
          visible: true,
          inToc: true,
          properties: {
            group_id: groupThematique.id_thematique,
            couche_id: couche.key_couche,
            type: 'couche'
          },
          iconImagette: environment.url_prefix + '/' + pathImg,
          icon: environment.url_prefix + '/' + couche.img,
          cluster: true,
          size: size,
          legendCapabilities: {
            useCartoServer: true
          },
          descriptionSheetCapabilities: couche.wms_type ? 'osm' : undefined
        })
        cartoHelperClass.addLayerToMap(layer)
        couche.check = true

      })
    }

  }

  /**
  * Remove layer of type 'carte' in map
  * @param carte coucheInterface
  */
  removeLayerCarte(carte: carteInterface) {
    var groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(carte.key_couche)

    let cartoHelperClass = new cartoHelper()

    var layer = cartoHelperClass.getLayerByPropertiesCatalogueGeosm({
      group_id: groupCarte.id_cartes,
      couche_id: carte.key_couche,
      type: 'carte'
    })

    for (let index = 0; index < layer.length; index++) {
      cartoHelperClass.removeLayerToMap(layer[index])
      carte.check = false
    }

  }

  /**
   * Add layer of type 'carte' to map
   * @param carte carteInterface
   */
  addLayerCarte(carte: carteInterface) {
    var groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(carte.key_couche)

    let cartoHelperClass = new cartoHelper()
    var type;
    if (carte.type == 'WMS') {
      type = 'wms'
    } else if (carte.type == 'xyz') {
      type = 'xyz'
    }
    if (cartoHelperClass.getLayerByName(carte.nom).length > 0) {
      this.notifier.notify("error", "Cette carte est déja ajoutée à la carte");
    } else {

      var layer = cartoHelperClass.constructLayer(
        {
          nom: carte.nom,
          type: type,
          type_layer: 'geosmCatalogue',
          url: carte.url,
          visible: true,
          inToc: true,
          properties: {
            group_id: groupCarte.id_cartes,
            couche_id: carte.key_couche,
            type: 'carte'
          },
          iconImagette: environment.url_prefix + '/' + carte.image_src,
          descriptionSheetCapabilities: undefined
        }
      )

      cartoHelperClass.addLayerToMap(layer)
      carte.check = true
    }

  }

}
