import { filterOptionInterface } from './search.component'
import { configProjetInterface } from '../../type/type';
import { StorageServiceService } from '../../../app/services/storage-service/storage-service.service'
import { GeosmLayersServiceService } from '../../../app/services/geosm-layers-service/geosm-layers-service.service'
import { AppInjector } from '../../../helper/app-injector.helper'
import { manageCompHelper } from '../../../helper/manage-comp.helper'
import { GeoJSON, Feature, Style, Icon } from '../../ol-module'
import { environment } from 'src/environments/environment';
import * as $ from 'jquery'

/**
 * class for handle couche thematique   search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleLayerSearch {

  StorageServiceService: StorageServiceService = AppInjector.get(StorageServiceService);
  manageCompHelper: manageCompHelper = AppInjector.get(manageCompHelper);
  GeosmLayersServiceService: GeosmLayersServiceService = AppInjector.get(GeosmLayersServiceService);
  configProject: configProjetInterface = this.StorageServiceService.getConfigProjet()

  constructor() {
    this.configProject = this.StorageServiceService.getConfigProjet()
  }

  /**
   * format response from server into a list to display on ui
   * @param responseDB any
   */
  formatDataForTheList(responseDB: any): Array<filterOptionInterface> {
    var response: Array<filterOptionInterface> = []

    for (let index = 0; index < responseDB.couches.length; index++) {
      const element = responseDB.couches[index];
      var couche = this.StorageServiceService.getCoucheFromKeyCouche(element.id)
      var group = this.StorageServiceService.getGroupThematiqueFromIdCouche(element.id)
      if (couche && group) {
        response.push({
          name: couche.nom,
          nameGroup: group.nom,
          number: couche.number,
          id: couche.key_couche,
          image_src: environment.url_prefix + couche.img,
          logo_src: environment.url_prefix + couche.logo_src,
          type: 'couche',
          typeOption: 'layer',
        })
      }
    }

    for (let index = 0; index < responseDB.cartes.length; index++) {
      const element = responseDB.cartes[index];
      var carte = this.StorageServiceService.getCarteFromIdCarte(element.id)
      var groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(element.id)

      if (carte && groupCarte) {
        response.push({
          name: carte.nom,
          nameGroup: groupCarte.nom,
          id: carte.key_couche,
          image_src: environment.url_prefix + carte.image_src,
          type: 'carte',
          typeOption: 'layer',
        })
      }
    }


    return response
  }

  /**
 * Use to format text that will appear after an option is choose in the autocomplete use to select layers in the UI
 * @param data filterOptionInterface
 * @return string
 */
  displayWith(data: filterOptionInterface): string {
    return ''
  }

  /**
   *  call when an option is select by the user
   * @param data searchLayerToDownlodModelInterface
   */
  optionSelected(data: filterOptionInterface) {
    if (data.type == 'couche') {
      var couche = this.StorageServiceService.getCoucheFromKeyCouche(data.id)
      let groupThem = this.StorageServiceService.getGroupThematiqueFromIdCouche(data.id)
      if (groupThem) {
        this.manageCompHelper.openGroupThematiqueSlide(groupThem)
      }
      if (couche) {
        this.GeosmLayersServiceService.addLayerCouche(couche)
        setTimeout(() => {
          try {
            $('#couche_'+couche.key_couche)[0].scrollIntoView(false);
          } catch (error) {
          }
        }, 1000);
      }
    }else if (data.type == 'carte'){
      var carte = this.StorageServiceService.getCarteFromIdCarte(data.id)
      let groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(data.id)
      if (groupCarte) {
        this.manageCompHelper.openGroupCarteSlide(groupCarte)
      }
      if (carte) {
        this.GeosmLayersServiceService.addLayerCarte(carte)
      }
    }
  }

}
