import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, from, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BackendApiService } from '../backend-api/backend-api.service'
import { groupThematiqueInterface, groupCarteInterface, configProjetInterface, carteInterface } from '../../type/type'
import { catchError } from 'rxjs/operators';
import { analyzeAndValidateNgModules } from '@angular/compiler';

@Injectable({
  providedIn: 'root'
})
/**
 * Access and update local data
 */
export class StorageServiceService {

  constructor(
    public BackendApiService: BackendApiService
  ) { }


  /**
   * BehaviorSubject of Differents states of the application
   */
  states:BehaviorSubject<{loadProjectData:boolean}> = new BehaviorSubject<{loadProjectData:boolean}>({loadProjectData:false} )
  /**
  * BehaviorSubject of List of all thematiques
  */
  public groupThematiques: BehaviorSubject<Array<groupThematiqueInterface>> = new BehaviorSubject(Array<groupThematiqueInterface>());

  /**
 * BehaviorSubject of List of all Cartes
 */
  public groupCartes: BehaviorSubject<Array<groupCarteInterface>> = new BehaviorSubject(Array<groupCarteInterface>());

  /**
   * BehaviorSubject of Configuration of the project
   */
  public configProject: BehaviorSubject<configProjetInterface> = new BehaviorSubject<configProjetInterface>({} as configProjetInterface)

  /**
   * Load data of the project
   * - Catalogue of thematique and cartes
   * - extent of the project
   * - Project configuration
   * - geosignets of projects
   */
  loadProjectData():Promise<{error:boolean,msg?:string}> {

    return  new Promise((resolve, reject) => {

    forkJoin(
      from(this.BackendApiService.getRequest("/geoportail/getCatalogue/")),
      from(this.BackendApiService.getRequest("/api/v1/RestFull/catalogAdminCartes/")),
      from(this.BackendApiService.getRequest("/getZoneInteret/")),
      from(this.BackendApiService.getRequest("/geoportail/getAllExtents/")),
      from(this.BackendApiService.getRequest("/config_bd_projet/")),
    )
      .pipe(
        catchError(err => {
          reject({
            error:true,
            msg:err
          })
          return '';
        })
      )
      .subscribe(results => {
        this.groupThematiques.next(results[0])
        this.groupCartes.next(results[1])
        this.configProject.next({
          bbox:results[4]['bbox'],
          limites:results[4]['limites'],
          geosignetsProject:results[3],
          roiGeojson:JSON.parse(results[2]['data']['geometry'])
        })

        this.states.getValue().loadProjectData = true
        this.states.next(this.states.getValue())
        resolve({
          error:false
        })
      })
    })
  }

  /**
   * Get the configuration of the project
   * @returns configProjetInterface
   */
  getConfigProjet():configProjetInterface{
    return this.configProject.getValue()
  }

  /**
   * Get the principal group carte and the carte. eg:the group contaignin the main map of the apps
   * @returns {groupCarte:groupCarteInterface,carte:carteInterface}}| null
   */

   getPrincipalCarte():{groupCarte:groupCarteInterface,carte:carteInterface}|null
   {
      for (let index = 0; index < this.groupCartes.getValue().length; index++) {
        const group = this.groupCartes.getValue()[index];
        if (group.principal) {
          // groupCarte = group
          if (group.sous_cartes) {
            for (let sIndex = 0; sIndex < group.sous_cartes.length; sIndex++) {
              const sous_groupe = group.sous_cartes[sIndex];
              for (let cIndex = 0; cIndex < sous_groupe.couches.length; cIndex++) {
                const carte = sous_groupe.couches[cIndex];
                if (carte.principal) {
                  return {
                    groupCarte:group,
                    carte:carte
                  }
                }
              }
            }
          }else{
            for (let cIndex = 0; cIndex < group.couches.length; cIndex++) {
              const carte = group.couches[cIndex];
              if (carte.principal) {
                return {
                  groupCarte:group,
                  carte:carte
                }
              }
            }
          }
        }
      }

      return null
   }

}
