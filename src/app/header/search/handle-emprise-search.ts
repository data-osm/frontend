import { filterOptionInterface } from './search.component'
import { responseOfSerachLimitInterface } from './interface-search'
import { configProjetInterface } from '../../type/type';
import { StorageServiceService } from '../../../app/services/storage-service/storage-service.service'
import { AppInjector } from '../../../helper/app-injector.helper'
import { Feature, GeoJSON, getArea } from 'src/app/ol-module';
import { cartoHelper } from 'src/helper/carto.helper';
import {BackendApiService} from '../../../app/services/backend-api/backend-api.service'
/**
 * class for handle administrative response search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleEmpriseSearch {

  StorageServiceService: StorageServiceService = AppInjector.get(StorageServiceService);
  BackendApiService: BackendApiService = AppInjector.get(BackendApiService);
  configProject: configProjetInterface = this.StorageServiceService.getConfigProjet()

  constructor() {
    this.configProject = this.StorageServiceService.getConfigProjet()
  }

  /**
   * format response from server into a list to display on ui
   * @param responseDB any
   */
  formatDataForTheList(responseDB: any): Array<filterOptionInterface> {
    if (responseDB.error) {
      return []
    }
    var response: Array<filterOptionInterface> = []
    for (const key in responseDB) {
      if (responseDB.hasOwnProperty(key) && key != 'status') {
        const element = responseDB[key];
        for (let index = 0; index < element.length; index++) {
          const responseI = element[index];
          if (this._getLimitName(key)) {
            response.push({
              ref: responseI['ref'],
              name: responseI['name'],
              id: responseI['id'],
              table: key,
              limitName: this._getLimitName(key),
              typeOption: 'limites'
            })
          }
        }
      }
    }
    return response
  }

  /**
 * get name of a limit by the name of it table
 * @param tableName string name of the table
 * @retun string
 */
  _getLimitName(tableName: string): string {
    var response;
    for (let index = 0; index < this.configProject.limites.length; index++) {
      const element = this.configProject.limites[index];
      if (element.nom_table == tableName) {
        response = element.nom
      }
    }
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
  optionSelected(emprise: filterOptionInterface) {
    if (!emprise.geometry) {
      var cartoClass = new cartoHelper()
      this._getGeometryOfEmprise({
        table:emprise.table,
        id:emprise.id
      }).then(
        (geometry)=>{
          if (geometry) {
            emprise.geometry = geometry
            this._addGeometryAndZoomTO(emprise)
            this.StorageServiceService.adminstrativeLimitLoad.next({
              'table':emprise.table,
              'id':emprise.id,
              'ref':emprise.ref,
              'limitName':emprise.limitName,
              'name':emprise.name,
              'geometry':geometry
            })
          }
        }
      )
    } else {
      this._addGeometryAndZoomTO(emprise)
    }
  }

   /**
   * get ol geometry of an emprise
   * @param params {table:string,id:number}
   * @return Promise<any>
   */
  _getGeometryOfEmprise(params: { table: string, id: number }):Promise<any> {
    return this.BackendApiService.post_requete('/getLimitById', params).then(
      (response) => {
        var geojson = JSON.parse(response["geometry"])
        var feature = new GeoJSON().readFeature(
          geojson,
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }
        );
        return feature.getGeometry()
      },
      (err) => {
        return
      }
    )
  }

  /**
   * add geometry to searchResultLayer and zoom to the geometry
   * @param emprise: filterOptionInterface
   */
  _addGeometryAndZoomTO(emprise: filterOptionInterface) {

    var formatArea = function (polygon) {
      var area = getArea(polygon);
      var output;
      if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + " " + "km²";
      } else {
        output = Math.round(area * 100) / 100 + " " + "m²";
      }

      return output;
    };

    if (emprise.geometry) {
      var cartoClass = new cartoHelper()
      if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
        var searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

        var feature = new Feature()
        var textLabel = emprise.name+'('+emprise.ref +") \n" +formatArea(emprise.geometry)

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
