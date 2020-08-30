import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { debounceTime, filter, startWith, tap, map, skip, catchError } from 'rxjs/operators';
import { from, Observable,fromEvent,merge as observerMerge,of } from 'rxjs';
import {BackendApiService} from 'src/app/services/backend-api/backend-api.service'
import {StorageServiceService} from 'src/app/services/storage-service/storage-service.service'
import { configProjetInterface } from 'src/app/type/type';
import {responseOfSearchPhotonInterface,responseOfSerachLimitInterface} from './interface-search'
import {handleEmpriseSearch} from './handle-emprise-search'
import {handlePhotonSearch} from './handle-photon-search'
import {handleAdresseFrSearch} from './handle-adresseFr-search'

export interface filterOptionInterface{
  name:string
  id:number,
  /**
   * type of the response. at the time of the writing of this code, there is 'limites' and 'photon'
   */
  typeOption:string
  [key:string]:any
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
/**
 * components for search in apps
 */
export class SearchComponent implements OnInit {

    /**
   * Configuration of the project
   */
  configProject: configProjetInterface


  /**
   * forms use to choose emprise to make the download
   */
  form: FormGroup;
  /**
   * list of all filtterd option
   */
  filterOptions: {[key:string]:Array<filterOptionInterface>} = {}

  objectsIn = Object.keys

  constructor(
    public fb: FormBuilder,
    public BackendApiService:BackendApiService,
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.configProject = this.StorageServiceService.getConfigProjet()
        this.initialiseForm()
      }
    })
  }

  /**
   * initialise form
   */
  initialiseForm(){
    var empriseControl = new FormControl('', [Validators.minLength(2)])

    empriseControl.valueChanges.pipe(
      debounceTime(300),
      filter(value => typeof value == 'string' && value.length > 1),
      startWith(''),
      skip(1),
      tap(() => { console.log('loading') }),
      map((value) => {
        return observerMerge (
          from(this.BackendApiService.post_requete('/searchLimite', { 'word': value.toString() })).pipe(
            map((val:{type:String,value:{[key:string]:any}}) => { return {type:'limites',value:val}} ),
            catchError( (err) =>  of({type:'limites',value:{} })  )
          ),
          from(this.BackendApiService.getRequestFromOtherHost('http://photon.komoot.de/api/?&limit=7&q='+value.toString()+"&lang=fr")).pipe(
            map((val:{type:String,value:any}) => { return {type:'photon',value:val}} ),
            catchError( (err) =>  of({type:'photon',value:{features:[]} })  )
          ),
          from(this.BackendApiService.getRequestFromOtherHost('https://api-adresse.data.gouv.fr/search/?limit=5&q='+value.toString())).pipe(
            map((val:{type:String,value:any}) => { return {type:'adresseFr',value:val}} ),
            catchError( (err) =>  of({type:'adresseFr',value:{features:[]} })  )
          )
        )
      })
    ).subscribe((value) => {
      value.subscribe((data) => {
        if(data.type == 'limites'){
          this.filterOptions['limites'] = new handleEmpriseSearch().formatDataForTheList(data.value)
        }else if (data.type == 'photon'){
          this.filterOptions['photon'] = new handlePhotonSearch().formatDataForTheList(data.value)
        }else if(data.type == 'adresseFr'){
          this.filterOptions['adresseFr'] = new handleAdresseFrSearch().formatDataForTheList(data.value)
        }

        this.cleanFilterOptions()

      })
    })

    this.form = this.fb.group({
      searchWord: empriseControl
    })
  }

  /**
   * Funtion use to display information of a selected option
   * @param option filterOptionInterface
   * @retun string
   */
  displayAutocompleFn(option:filterOptionInterface):string{
    if (option.typeOption == 'limites'){
      return new handleEmpriseSearch().displayWith(option)
    }else  if (option.typeOption == 'photon'){
      return new handlePhotonSearch().displayWith(option)
    }else  if (option.typeOption == 'adresseFr'){
      return new handleAdresseFrSearch().displayWith(option)
    }
  }

  /**
   * clean filterOptions data
   * - if an option have no value, clean it
   * - order how data are display
   */
  cleanFilterOptions(){
    for (const key in this.filterOptions) {
      if (this.filterOptions.hasOwnProperty(key)) {
        const element = this.filterOptions[key];
        if (element.length == 0) {
          delete this.filterOptions[key]
        }
      }
    }
  }

}
