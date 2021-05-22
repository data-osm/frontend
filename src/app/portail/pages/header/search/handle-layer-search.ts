import { filterOptionInterface } from './search.component'
import { configProjetInterface, Layer } from '../../../../type/type';
import { StorageServiceService } from '../../../../services/storage-service/storage-service.service'
import { AppInjector } from '../../../../../helper/app-injector.helper'
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import { GeoJSON, Feature, Style, Icon, Map } from '../../../../ol-module'
import * as $ from 'jquery'
import { environment } from '../../../../../environments/environment';
import { DataOsmLayersServiceService } from '../../../../services/data-som-layers-service/data-som-layers-service.service';
import { MapsService } from '../../../../data/services/maps.service';
import { catchError, take, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

/**
 * class for handle couche thematique   search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleLayerSearch {

  // StorageServiceService: StorageServiceService = AppInjector.get(StorageServiceService);
  manageCompHelper: ManageCompHelper = AppInjector.get(ManageCompHelper);
  dataOsmLayersServiceService: DataOsmLayersServiceService = AppInjector.get(DataOsmLayersServiceService);
  mapsService: MapsService = AppInjector.get(MapsService);

  constructor() {
  }

  /**
   * format response from server into a list to display on ui
   * @param responseDB any
   */
  formatDataForTheList(responseDB: Layer[]): Array<filterOptionInterface> {
    var response: Array<filterOptionInterface> =
      responseDB
        .filter((layer) => layer.providers.filter((pr) => pr.vp.state === 'good').length > 0)
        .map((layer) => {
          return {
            name: layer.name,
            layer: layer,
            number: layer.providers.map((pr) => pr.vp.count).reduce((a, b) => a + b, 0),
            id: layer.layer_id,
            icon: environment.backend + layer.cercle_icon,
            typeOption: 'layer'
          }
        })
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
  optionSelected(data: filterOptionInterface, map: Map) {
    let layer: Layer = data.layer
    this.mapsService.getSubWithGroup(layer.sub).pipe(
      take(1),
      catchError(() => {
        return EMPTY
      }),
      tap((subGroup) => {
        this.dataOsmLayersServiceService.addLayer(data.layer, map, subGroup.group)
        // setTimeout(() => {
        //   try {
        //     $('#couche_'+couche.key_couche)[0].scrollIntoView(false);
        //   } catch (error) {
        //   }
        // }, 1000);
      })
    ).subscribe()

  }

}
