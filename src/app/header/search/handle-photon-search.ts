import { filterOptionInterface } from './search.component'
import { responseOfSerachLimitInterface } from './interface-search'
import { configProjetInterface } from '../../type/type';
import { StorageServiceService } from '../../../app/services/storage-service/storage-service.service'
import { AppInjector } from '../../../helper/app-injector.helper'
import { GeoJSON } from '../../ol-module'
/**
 * class for handle photon search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handlePhotonSearch {

  StorageServiceService: StorageServiceService = AppInjector.get(StorageServiceService);
  configProject: configProjetInterface = this.StorageServiceService.getConfigProjet()

  constructor() {
    this.configProject = this.StorageServiceService.getConfigProjet()
  }

  /**
   * format response from server into a list to display on ui
   * @see inspired by https://github.com/komoot/leaflet.photon/blob/master/leaflet.photon.js#L244
   * @param responseDB any
   */
  formatDataForTheList(responseDB: any): Array<filterOptionInterface> {
    var response: Array<filterOptionInterface> = []
    for (let index = 0; index < responseDB.features.length; index++) {
      const element = responseDB.features[index];
      var features = new GeoJSON().readFeatures(element, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      if (features.length > 0) {
        var  details = []
        if (this._formatType(element)) {
          details.push(this._formatType(element))
        }

        if (element.properties.city && element.properties.city !== element.properties.name) {
          details.push(element.properties.city);
         }

        if (element.properties.country) {
          // details.push(element.properties.country)
        }

        response.push({
          name: this._formatAdresse(element) ? this._formatAdresse(element) : features[0].get('name'),
          id: features[0].get('osm_id'),
          geometry: features[0].getGeometry(),
          typeOsm: this._formatType(element),
          details:details.join(', '),
          typeOption: 'photon',
          ...features[0].getProperties()
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
    if (data) {
      return data.name +' ('+data.details+')'
    } else {
      return ''
    }
  }

  _formatAdresse(option) {
    var adresse;
    if (option.properties.housenumber) {
      adresse = option.properties.housenumber
      if (option.properties.sreet) {
        adresse += option.properties.sreet
      }
    }
    return adresse;
  }

  _formatType(option) {
    return option.properties.osm_value === 'yes'
      ? option.properties.osm_key
      : option.properties.osm_value;
  }

}
