import { filterOptionInterface } from './search.component'
import { responseOfSerachLimitInterface } from './interface-search'
import { configProjetInterface } from '../../../../type/type';
import { AppInjector } from '../../../../../helper/app-injector.helper'
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { GeoJSON, Feature, getArea, getCenter } from '../../../../ol-module'
import { CartoHelper } from '../../../../../helper/carto.helper';
import { AdminBoundaryRespone } from '../../../../data/models/parameters';
import { ParametersService } from '../../../../data/services/parameters.service';
import { catchError, take, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import {
  Map,
  VectorSource
} from "../../../../giro-3d-module"
import { Vector3 } from 'three';

/**
 * class for handle administrative response search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleEmpriseSearch {

  parametersService: ParametersService = AppInjector.get(ParametersService);
  BackendApiService: BackendApiService = AppInjector.get(BackendApiService);

  constructor() {
  }

  /**
   * format response from server into a list to display on ui
   * @param responseDB any
   */
  formatDataForTheList(responseDB: AdminBoundaryRespone[]): Array<filterOptionInterface> {

    let response: Array<filterOptionInterface> =
      responseDB.map((item) => {
        return {
          name: item.feature.name,
          id: item.feature.table_id,
          table_id: item.feature.table_id,
          vector_id: item.adminBoundary.vector,
          adminBoundary_name: item.adminBoundary.name,
          typeOption: 'limites'
        }
      })
    return response
  }

  /**
 * Use to format text that will appear after an option is choose in the autocomplete use to select layers in the UI
 * @param emprise searchLayerToDownlodModelInterface
 * @return string
 */
  displayWith(emprise: filterOptionInterface): string {
    if (emprise) {
      if (emprise.ref) {
        return emprise.name + '(' + emprise.ref + ')'
      } else {
        return emprise.name
      }
    } else {
      return ''
    }
  }

  /**
   *  call when an option is select by the user
   * @param emprise searchLayerToDownlodModelInterface
   */
  optionSelected(emprise: filterOptionInterface, map: Map) {
    this.parametersService.getAdminBoundaryFeature(emprise.vector_id, emprise.table_id).pipe(
      take(1),
      catchError(() => {
        return EMPTY
      }),
      tap((response) => {

        this._addGeometryAndZoomTO({
          geometry: JSON.parse(response.geometry),
          name: response.name
        }, map)
      })
    ).subscribe()
  }



  /**
   * add geometry to searchResultLayer and zoom to the geometry
   * @param emprise: filterOptionInterface
   */
  _addGeometryAndZoomTO(emprise: { geometry: any, ref?: string, name: string }, map: Map) {

    let formatArea = function (polygon) {
      let area = getArea(polygon);
      let output;
      if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + " " + "km²";
      } else {
        output = Math.round(area * 100) / 100 + " " + "m²";
      }

      return output;
    };

    if (emprise.geometry) {
      let cartoClass = new CartoHelper(map)
      if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
        let searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

        let feature = new GeoJSON().readFeature(
          emprise.geometry,
          // {
          //   dataProjection: "EPSG:3857",
          //   featureProjection: "EPSG:3857",
          // }
        );

        let textLabel: string
        if (emprise.ref) {
          textLabel = emprise.name + '(' + emprise.ref + ") \n" + formatArea(feature.getGeometry())
        } else {
          textLabel = emprise.name + " \n" + formatArea(feature.getGeometry())
        }

        feature.set('textLabel', textLabel)

        const source = searchResultLayer.source as VectorSource

        source.source.clear()
        source.source.addFeature(feature)

        if (feature.getGeometry().getType() == "Point" || feature.getGeometry().getType() == "MultiPoint") {
          const center = getCenter(feature.getGeometry().getExtent())
          cartoClass.panTo(
            new Vector3(
              center[0],
              center[1],
              0
            )
          )
        } else {

          cartoClass.zoomToExtent(CartoHelper.olGeometryToGiroExtent(feature.getGeometry()), 16)
        }


      }
    }
  }

}
