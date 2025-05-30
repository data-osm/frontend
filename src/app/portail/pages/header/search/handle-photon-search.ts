import { filterOptionInterface } from './search.component'
import { responseOfSerachLimitInterface } from './interface-search'
import { configProjetInterface } from '../../../../type/type';
import { AppInjector } from '../../../../../helper/app-injector.helper'
import { GeoJSON, Feature } from '../../../../ol-module'
import { CartoHelper } from '../../../../../helper/carto.helper';
import {
  Map,
  VectorSource
} from "../../../../giro-3d-module"
/**
 * class for handle photon search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handlePhotonSearch {


  constructor() {
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
        var details = []
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
          details: details.join(', '),
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
      return data.name + ' (' + data.details + ')'
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

  /**
  *  call when an option is select by the user
  * @param emprise searchLayerToDownlodModelInterface
  */
  optionSelected(emprise: filterOptionInterface, map: Map) {
    if (!emprise.geometry) {

    } else {
      this._addGeometryAndZoomTO(emprise, map)
    }
  }

  /**
 * add geometry to searchResultLayer and zoom to the geometry
 * @param emprise: filterOptionInterface
 */
  _addGeometryAndZoomTO(emprise: filterOptionInterface, map: Map) {
    if (emprise.geometry) {
      var cartoClass = new CartoHelper(map)
      if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
        var searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

        var feature = new Feature()
        var textLabel = emprise.name

        feature.set('textLabel', textLabel)
        feature.setGeometry(emprise.geometry)
        feature.setGeometry(emprise.geometry)

        const source = searchResultLayer.source as VectorSource

        source.source.clear()
        source.source.addFeature(feature)

        cartoClass.zoomToExtent(CartoHelper.olGeometryToGiroExtent(emprise.geometry), 16)

      }
    }
  }

}
