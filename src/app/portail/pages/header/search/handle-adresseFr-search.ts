import { filterOptionInterface } from './search.component'
import { configProjetInterface } from '../../../../type/type';
import { AppInjector } from '../../../../../helper/app-injector.helper'
import { GeoJSON, Feature, Style, Icon, Map } from '../../../../ol-module'
import { CartoHelper } from '../../../../../helper/carto.helper';
/**
 * @see https://geo.api.gouv.fr/adresse
 * class for handle adresse Fr  search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleAdresseFrSearch {


  constructor() {
  }

  /**
   * format response from server into a list to display on ui
   * @see https://geo.api.gouv.fr/adresse
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
        response.push({
          ...features[0].getProperties(),
          name: element.properties.label,
          id: element.properties.id,
          city: element.properties.city,
          geometry: features[0].getGeometry(),
          typeOption: 'adresseFr',
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
      return data.name
    } else {
      return ''
    }
  }

  /**
   *  call when an option is select by the user
   * @param emprise searchLayerToDownlodModelInterface
   */
  optionSelected(emprise: filterOptionInterface, map:Map) {
    if (!emprise.geometry) {

    } else {
      this._addGeometryAndZoomTO(emprise, map)
    }
  }

  /**
 * add geometry to searchResultLayer and zoom to the geometry
 * @param emprise: filterOptionInterface
 */
  _addGeometryAndZoomTO(emprise: filterOptionInterface, map:Map) {
    if (emprise.geometry) {
      var cartoClass = new CartoHelper(map)
      if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
        var searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

        var feature = new Feature()
        var textLabel = emprise.name

        feature.set('textLabel',textLabel)
        feature.setGeometry(emprise.geometry)

        searchResultLayer.getSource().clear()

        searchResultLayer.getSource().addFeature(feature)

        var extent = emprise.geometry.getExtent()

        cartoClass.fit_view(extent, 16)

      }
    }
  }


}
