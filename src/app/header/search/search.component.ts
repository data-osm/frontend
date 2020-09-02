import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { debounceTime, filter, startWith, tap, map, skip, catchError } from 'rxjs/operators';
import { from, Observable, fromEvent, merge as observerMerge, of } from 'rxjs';
import { BackendApiService } from 'src/app/services/backend-api/backend-api.service'
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { configProjetInterface } from 'src/app/type/type';
import { responseOfSearchPhotonInterface, responseOfSerachLimitInterface } from './interface-search'
import { handleEmpriseSearch } from './handle-emprise-search'
import { handlePhotonSearch } from './handle-photon-search'
import { handleAdresseFrSearch } from './handle-adresseFr-search'
import { handleLayerSearch } from './handle-layer-search'
import { VectorLayer, VectorSource, Style, Fill, Stroke, CircleStyle, Icon, Text } from 'src/app/ol-module';
import { manageDataHelper } from 'src/helper/manage-data.helper';
import { cartoHelper } from 'src/helper/carto.helper';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { environment } from 'src/environments/environment';

export interface filterOptionInterface {
  name: string
  id: number,
  /**
   * type of the response. at the time of the writing of this code, there is 'limites' and 'photon'
   */
  typeOption: string
  [key: string]: any
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
  filterOptions: { [key: string]: Array<filterOptionInterface> } = {
    layer: [],
    limites: [],
    photon: [],
    adresseFr: [],
  }

  objectsIn = Object.keys

  /**
 * VectorLayer of search Result  and style
 */
  searchResultLayer: VectorLayer = new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      var textLabel;
      var textStyle = {
        font: "15px Calibri,sans-serif",
        fill: new Fill({ color: "#000" }),
        stroke: new Stroke({ color: "#000", width: 1 }),
        padding: [10, 10, 10, 10],
        offsetX: 0,
        offsetY: 0,
      }
      if (feature.get('textLabel')) {
        textLabel = feature.get('textLabel')
        textStyle['text'] = textLabel
        if (feature.getGeometry().getType() == 'Point') {
          textStyle.offsetY = 40
          textStyle['backgroundFill'] = new Fill({ color: "#fff" })
        }


      }

      var color = '#FFEB3B'
      return new Style({
        fill: new Fill({
          color: [manageDataHelper.hexToRgb(color).r, manageDataHelper.hexToRgb(color).g, manageDataHelper.hexToRgb(color).b, 0.5]
        }),
        stroke: new Stroke({
          color: '#04458F',
          width: 6
        }),
        image: new Icon({
          scale: 0.7,
          src: '/assets/icones/marker-search.png'
        }),
        text: new Text(textStyle)
      })
    },
    type_layer: 'searchResultLayer',
    nom: 'searchResultLayer'
  });

  constructor(
    public fb: FormBuilder,
    public BackendApiService: BackendApiService,
    public StorageServiceService: StorageServiceService
  ) { }

  ngOnInit(): void {
    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.configProject = this.StorageServiceService.getConfigProjet()
        this.initialiseForm()
        this.initialiseSearchResultLayer()
      }
    })
  }

  /**
   * Initialise search result layer in the map
   */
  initialiseSearchResultLayer() {
    var cartoClass = new cartoHelper()
    if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
      this.searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]
      this.searchResultLayer.setZIndex(1000)
    } else {
      this.searchResultLayer.setZIndex(1000)
      cartoClass.map.addLayer(this.searchResultLayer)
    }

    if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
      cartoClass.getLayerByName('searchResultLayer')[0].getSource().clear()
    }

  }

  /**
   * get querry for search
   * TO BE AMELIORATE WITH ENVIRONMENT VARIABLE
   * @param value string text to search
   */
  getQuerryForSerach(value:string): Observable<{ type: String,error:boolean, value: { [key: string]: any } }>[] {

    var querryObs = [

      from(this.BackendApiService.post_requete('/searchCouche', { 'word': value.toString() })).pipe(
        map((val: { type: String, value: any }) => { return { type: 'layer', value: val, error:false } }),
        catchError((_err) => of({  error:true,type: 'layer', value: { features: [] } }))
      )
    ]



    /** if we have extent of the project, search with photon in that extent */
    if (this.StorageServiceService.getExtentOfProject()) {

      var bboxPhoton = this.StorageServiceService.getExtentOfProject().join(",")
      querryObs.push(
        from(this.BackendApiService.getRequestFromOtherHost('http://photon.komoot.de/api/?&limit=7&q=' + value.toString() + "&lang=fr" + "&bbox=" + bboxPhoton)).pipe(
          map((val: { type: String, value: any }) => { return { type: 'photon', value: val, error:false } }),
          catchError((_err) => of({  error:true,type: 'photon', value: { features: [] } }))
        )
      )
    }

    /** if administrative limits is set in the project  */
    if (this.StorageServiceService.configProject.value.limites.length > 0) {
      querryObs.push(
        from(this.BackendApiService.post_requete('/searchLimite', { 'word': value.toString() })).pipe(
          map((val: { type: String, value: any }) => { return { type: 'limites', value: val, error:false } }),
          catchError((_err) => of({  error:true,type: 'limites', value: { features: [] }  }))
        )
      )
    }

    /**
     * if project is france, we add search for adresses of France
     */
    if (environment.pojet_nodejs =='france') {
      querryObs.push(
        from(this.BackendApiService.getRequestFromOtherHost('https://api-adresse.data.gouv.fr/search/?limit=5&q=' + value.toString())).pipe(
          map((val: { type: String, value: any }) => { return { type: 'adresseFr', value: val, error:false } }),
          catchError((_err) => of({  error:true,type: 'adresseFr', value: { features: [] } }))
        )
      )
    }

    return querryObs
  }

  /**
   * initialise form
   */
  initialiseForm() {
    var empriseControl = new FormControl('', [Validators.minLength(2)])
    empriseControl.valueChanges.pipe(
      debounceTime(500),
      filter(value => typeof value == 'string' && value.length > 2),
      startWith(''),
      skip(1),
      tap(() => { console.log('loading') }),
      map((value) => {
        return observerMerge(
          ...this.getQuerryForSerach(value)
        )
      })
    ).subscribe((value) => {
      value.subscribe((data) => {
        console.log(this.StorageServiceService.getExtentOfProject())

        if (data.type == 'limites') {
          this.filterOptions['limites'] = new handleEmpriseSearch().formatDataForTheList(data.value)
        } else if (data.type == 'photon') {
          this.filterOptions['photon'] = new handlePhotonSearch().formatDataForTheList(data.value)
        } else if (data.type == 'adresseFr') {
          this.filterOptions['adresseFr'] = new handleAdresseFrSearch().formatDataForTheList(data.value)
        } else if (data.type == 'layer') {
          this.filterOptions['layer'] = new handleLayerSearch().formatDataForTheList(data.value)
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
  displayAutocompleFn(option: filterOptionInterface): string {
    if (option.typeOption == 'limites') {
      return new handleEmpriseSearch().displayWith(option)
    } else if (option.typeOption == 'photon') {
      return new handlePhotonSearch().displayWith(option)
    } else if (option.typeOption == 'adresseFr') {
      return new handleAdresseFrSearch().displayWith(option)
    } else if (option.typeOption == 'layer') {
      return new handleLayerSearch().displayWith(option)
    }
  }

  /**
   * Funtion call when user select an option
   * @param selected MatAutocompleteSelectedEvent
   */
  optionAutocomplteSelected(selected: MatAutocompleteSelectedEvent) {
    var option: filterOptionInterface = selected.option ? selected.option.value : undefined
    if (option) {
      if (option.typeOption == 'limites') {
        new handleEmpriseSearch().optionSelected(option)
      } else if (option.typeOption == 'photon') {
        new handlePhotonSearch().optionSelected(option)
      } else if (option.typeOption == 'adresseFr') {
        new handleAdresseFrSearch().optionSelected(option)
      } else if (option.typeOption == 'layer') {
        new handleLayerSearch().optionSelected(option)
        this.clearSearch()
      }
    }

  }

  /**
   * clean filterOptions data
   * - if an option have no value, clean it
   * - order how data are display
   */
  cleanFilterOptions() {
    for (const key in this.filterOptions) {
      if (this.filterOptions.hasOwnProperty(key)) {
        const element = this.filterOptions[key];
        if (element.length == 0) {
          this.filterOptions[key] = []
        }
      }
    }
  }

  /**
   * clear search : set seach input to '' and clean layer source
   */
  clearSearch() {
    this.form.get('searchWord').patchValue('')
    var cartoClass = new cartoHelper()
    if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
      var searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

      searchResultLayer.getSource().clear()
    }
  }

}
