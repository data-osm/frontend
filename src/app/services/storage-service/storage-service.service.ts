import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, from, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BackendApiService } from '../backend-api/backend-api.service'
import { groupThematiqueInterface, groupCarteInterface, configProjetInterface, carteInterface, coucheInterface, groupInterface } from '../../type/type'
import { catchError } from 'rxjs/operators';
import { analyzeAndValidateNgModules } from '@angular/compiler';
import { Feature, GeoJSON } from 'src/app/ol-module';

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
  states: BehaviorSubject<{ loadProjectData: boolean }> = new BehaviorSubject<{ loadProjectData: boolean }>({ loadProjectData: false })
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
  loadProjectData(): Promise<{ error: boolean, msg?: string }> {

    return new Promise((resolve, reject) => {

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
              error: true,
              msg: err
            })
            return '';
          })
        )
        .subscribe(results => {
          this.groupThematiques.next(results[0])
          this.groupCartes.next(results[1])
          this.configProject.next({
            bbox: results[4]['bbox'],
            limites: results[4]['limites'],
            geosignetsProject: results[3],
            roiGeojson: JSON.parse(results[2]['data']['geometry'])
          })

          this.states.getValue().loadProjectData = true
          this.states.next(this.states.getValue())
          resolve({
            error: false
          })
        })
    })
  }

  /**
   * Get the configuration of the project
   * @returns configProjetInterface
   */
  getConfigProjet(): configProjetInterface {
    return this.configProject.getValue()
  }

  /**
   * Get the principal group carte and the carte. eg:the group contaignin the main map of the apps
   * @returns {groupCarte:groupCarteInterface,carte:carteInterface}}| null
   */

  getPrincipalCarte(): { groupCarte: groupCarteInterface, carte: carteInterface } | null {
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
                  groupCarte: group,
                  carte: carte
                }
              }
            }
          }
        } else {
          for (let cIndex = 0; cIndex < group.couches.length; cIndex++) {
            const carte = group.couches[cIndex];
            if (carte.principal) {
              return {
                groupCarte: group,
                carte: carte
              }
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Get all groups cartes of project
   * @return Array<groupCarteInterface>
   */
  getAllGroupCarte(): Array<groupCarteInterface> {
    return this.groupCartes.getValue()
  }

  /**
   * Get all groups of thematiques of the project
   */
  getAllGroupThematiques(): Array<groupThematiqueInterface> {
    return this.groupThematiques.getValue()
  }

  /**
   * Get group thematique by id thematique
   * @param id_thematique number
   */
  getGroupThematiqueById(id_thematique: number): groupThematiqueInterface {


    for (let index = 0; index < this.groupThematiques.getValue().length; index++) {
      const thematique = this.groupThematiques.getValue()[index];
      if (thematique.id_thematique === id_thematique) {
        return thematique
      }
    }
  }

  /**
   * Get group carte by id carte
   * @param id_carte number
   */
  getGroupcarteById(id_carte: number): groupCarteInterface {

    for (let index = 0; index < this.groupCartes.getValue().length; index++) {
      const carte = this.groupCartes.getValue()[index];
      if (carte.id_cartes == id_carte) {
        return carte
      }
    }
  }

  /**
   * Get couche by id_thematique and id_couche
   * @param id_Groupthematique number
   * @param id_couche number
   * @return coucheInterface
   */
  getCouche(id_Groupthematique: number, id_couche: number): coucheInterface {
    var groupThematique = this.getGroupThematiqueById(id_Groupthematique)
    if (!groupThematique) {
      return
    }

    if (groupThematique.sous_thematiques) {
      for (let index = 0; index < groupThematique.sous_thematiques.length; index++) {
        const sous_thematique = groupThematique.sous_thematiques[index];
        for (let jndex = 0; jndex < sous_thematique.couches.length; jndex++) {
          const couche = sous_thematique.couches[jndex];
          if (couche.key_couche == id_couche) {
            return couche
          }
        }
      }
    } else {
      for (let jndex = 0; jndex < groupThematique.couches.length; jndex++) {
        const couche = groupThematique.couches[jndex];
        if (couche.key_couche == id_couche) {
          return couche
        }
      }
    }

  }

  /**
   * Get couche from key_couche
   * @param id_couche number id couche of the couche
   * @return groupThematiqueInterface
   */
  getCoucheFromKeyCouche(id_couche: number): coucheInterface {
    var coucheResponnse:coucheInterface;
    for (let index = 0; index < this.groupThematiques.getValue().length; index++) {
      const groupThematique = this.groupThematiques.getValue()[index];
      if (groupThematique.sous_thematiques) {
        for (let sindex = 0; sindex < groupThematique.sous_thematiques.length; sindex++) {
          const sous_thematique = groupThematique.sous_thematiques[sindex];
          for (let jndex = 0; jndex < sous_thematique.couches.length; jndex++) {
            const couche = sous_thematique.couches[jndex];
            if (couche.key_couche == id_couche) {
              coucheResponnse =  couche
            }
          }
        }
      }else{
        for (let jndex = 0; jndex < groupThematique.couches.length; jndex++) {
          const couche = groupThematique.couches[jndex];
          if (couche.key_couche == id_couche) {
            coucheResponnse =  couche
          }
        }
      }
    }
    return  coucheResponnse
  }


  /**
   * Get carte by id_groupCarte and id_carte
   * @param id_groupCarte number
   * @param id_carte number
   * @return carteInterface
   */
  getCarte(id_groupCarte: number, id_carte: number): carteInterface {
    var groupCarte = this.getGroupcarteById(id_groupCarte)
    if (!groupCarte) {
      return
    }

    if (groupCarte.sous_cartes) {
      for (let sIndex = 0; sIndex < groupCarte.sous_cartes.length; sIndex++) {
        const sous_groupe = groupCarte.sous_cartes[sIndex];
        for (let cIndex = 0; cIndex < sous_groupe.couches.length; cIndex++) {
          const carte = sous_groupe.couches[cIndex];
          if (carte.key_couche == id_carte) {
            return carte
          }
        }
      }
    } else {
      for (let cIndex = 0; cIndex < groupCarte.couches.length; cIndex++) {
        const carte = groupCarte.couches[cIndex];
        if (carte.key_couche == id_carte) {
          return carte
        }
      }
    }
  }

   /**
   * Get group carte from id_carte
   * @param id_carte number id carte of the carte
   * @return carteInterface
   */
  getCarteFromIdCarte(id_carte:number):carteInterface{
    for (let index = 0; index < this.groupCartes.getValue().length; index++) {
      const groupCarte = this.groupCartes.getValue()[index];
      if (groupCarte.sous_cartes) {
        for (let sIndex = 0; sIndex < groupCarte.sous_cartes.length; sIndex++) {
          const sous_groupe = groupCarte.sous_cartes[sIndex];
          for (let cIndex = 0; cIndex < sous_groupe.couches.length; cIndex++) {
            const carte = sous_groupe.couches[cIndex];
            if (carte.key_couche == id_carte) {
              return carte
            }
          }
        }
      } else {
        for (let cIndex = 0; cIndex < groupCarte.couches.length; cIndex++) {
          const carte = groupCarte.couches[cIndex];
          if (carte.key_couche == id_carte) {
            return carte
          }
        }
      }

    }
  }

  /**
   * Get group thematique from id_couche
   * @param id_couche number id couche of the couche
   * @return groupThematiqueInterface
   */
  getGroupThematiqueFromIdCouche(id_couche: number): groupThematiqueInterface {
    var groupThematiqueResponse:groupThematiqueInterface;
    for (let index = 0; index < this.groupThematiques.getValue().length; index++) {
      const groupThematique = this.groupThematiques.getValue()[index];
      if (groupThematique.sous_thematiques) {
        for (let sindex = 0; sindex < groupThematique.sous_thematiques.length; sindex++) {
          const sous_thematique = groupThematique.sous_thematiques[sindex];
          for (let jndex = 0; jndex < sous_thematique.couches.length; jndex++) {
            const couche = sous_thematique.couches[jndex];
            if (couche.key_couche == id_couche) {
              groupThematiqueResponse =  groupThematique
            }
          }
        }
      }else{
        for (let jndex = 0; jndex < groupThematique.couches.length; jndex++) {
          const couche = groupThematique.couches[jndex];
          if (couche.key_couche == id_couche) {
            groupThematiqueResponse =  groupThematique
          }
        }
      }
    }
    return  groupThematiqueResponse
  }

  /**
   * Get group carte from id_carte
   * @param id_carte number id carte of the carte
   * @return groupCarteInterface
   */
  getGroupCarteFromIdCarte(id_carte:number):groupCarteInterface{
    for (let index = 0; index < this.groupCartes.getValue().length; index++) {
      const groupCarte = this.groupCartes.getValue()[index];
      if (groupCarte.sous_cartes) {
        for (let sIndex = 0; sIndex < groupCarte.sous_cartes.length; sIndex++) {
          const sous_groupe = groupCarte.sous_cartes[sIndex];
          for (let cIndex = 0; cIndex < sous_groupe.couches.length; cIndex++) {
            const carte = sous_groupe.couches[cIndex];
            if (carte.key_couche == id_carte) {
              return groupCarte
            }
          }
        }
      } else {
        for (let cIndex = 0; cIndex < groupCarte.couches.length; cIndex++) {
          const carte = groupCarte.couches[cIndex];
          if (carte.key_couche == id_carte) {
            return groupCarte
          }
        }
      }

    }
  }

  /**
   * get extent of the project
   * - if there is multiple geo signets for the project, take the active one
   * - if there is not multiple geo signets for the project, take the ROI of the project
   * @retrun Extent in 4326
   */
  getExtentOfProject():[number,number,number,number]{
    var feature;
    if (this.configProject.value.geosignetsProject.length > 0) {
      for (let index = 0; index < this.configProject.value.geosignetsProject.length; index++) {
        const geoSignet = this.configProject.value.geosignetsProject[index];
        if(geoSignet.active){
          var features = new GeoJSON().readFeatures(JSON.parse(geoSignet.geometry),{
            // dataProjection: 'EPSG:4326',
            // featureProjection: 'EPSG:3857'
          })
          if (features.length > 0) {
            feature = features[0]
          }
        }
      }
    }

    if (!feature) {
      var features = new GeoJSON().readFeatures(this.configProject.value.roiGeojson,{
        // dataProjection: 'EPSG:4326',
        // featureProjection: 'EPSG:3857'
      })
      if (features.length > 0) {
        feature = features[0]
      }
    }

    if (feature) {
      return feature.getGeometry().getExtent()
    }else{
      return
    }
  }


}
