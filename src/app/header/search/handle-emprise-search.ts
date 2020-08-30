import { filterOptionInterface } from './search.component'
import { responseOfSerachLimitInterface } from './interface-search'
import { configProjetInterface } from '../../type/type';
import { StorageServiceService } from '../../../app/services/storage-service/storage-service.service'
import { AppInjector } from '../../../helper/app-injector.helper'

/**
 * class for handle administrative response search:
 * - format data from server to display list od response
 * - format response when user select an option
 */
export class handleEmpriseSearch {

  StorageServiceService: StorageServiceService = AppInjector.get(StorageServiceService);
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
    for (const key in responseDB) {
      if (responseDB.hasOwnProperty(key) && key != 'status') {
        const element = responseDB[key];
        for (let index = 0; index < element.length; index++) {
          const responseI = element[index];
          if (this.getLimitName_(key)) {
            response.push({
              ref: responseI['ref'],
              name: responseI['name'],
              id: responseI['id'],
              table: key,
              limitName: this.getLimitName_(key),
              typeOption:'emprises'
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
  getLimitName_(tableName: string): string {
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

}
