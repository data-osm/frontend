import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, from, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BackendApiService } from '../backend-api/backend-api.service'
import { groupThematiqueInterface, groupCarteInterface, configProjetInterface } from '../../type/type'
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
  * BehaviorSubject of List of all thematiques
  */
  private groupThematiques: BehaviorSubject<Array<groupThematiqueInterface>> = new BehaviorSubject(Array<groupThematiqueInterface>());

  /**
 * BehaviorSubject of List of all Cartes
 */
  private groupCartes: BehaviorSubject<Array<groupCarteInterface>> = new BehaviorSubject(Array<groupCarteInterface>());

  /**
   * BehaviorSubject of Configuration of the project
   */
  private configProject: BehaviorSubject<configProjetInterface> = new BehaviorSubject<configProjetInterface>({} as configProjetInterface)

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
        console.log(results)
        this.groupThematiques.next(results[0])
        this.groupCartes.next(results[1])
        this.configProject.next({
          bbox:results[4]['bbox'],
          limites:results[4]['limites'],
          geosignetsProject:results[3],
          roiGeojson:JSON.parse(results[2]['data']['geometry'])
        })
        resolve({
          error:false
        })
      })
    })
  }

}
