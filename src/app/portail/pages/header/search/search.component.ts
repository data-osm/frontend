import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { debounceTime, filter, startWith, tap, map, skip, catchError, take, switchMap, takeUntil } from 'rxjs/operators';
import { from, Observable, fromEvent, merge as observerMerge, of, EMPTY, Subject, ReplaySubject } from 'rxjs';
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { configProjetInterface } from '../../../../type/type';
import { responseOfSearchPhotonInterface, responseOfSerachLimitInterface } from './interface-search'
import { handleEmpriseSearch } from './handle-emprise-search'
import { handlePhotonSearch } from './handle-photon-search'
import { handleAdresseFrSearch } from './handle-adresseFr-search'
import { handleLayerSearch } from './handle-layer-search'
import { VectorLayer, VectorSource, Style, Fill, Stroke, CircleStyle, Icon, Text, Map } from '../../../../ol-module';
import { manageDataHelper } from '../../../../../helper/manage-data.helper';
import { CartoHelper } from '../../../../../helper/carto.helper';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { environment } from '../../../../../environments/environment';
import { SearchLayerService } from '../../../../data/services/search-layer.service';
import { ParametersService } from '../../../../data/services/parameters.service';

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
  public onInitInstance: () => void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  @Input() map: Map

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
  });

  constructor(
    public fb: FormBuilder,
    public BackendApiService: BackendApiService,
    public searchLayerService: SearchLayerService,
    public parametersService: ParametersService
  ) {
    this.searchResultLayer.set('type_layer', 'searchResultLayer')
    this.searchResultLayer.set('nom', 'searchResultLayer')


    let empriseControl = new FormControl('', [Validators.minLength(2)])

    this.form = this.fb.group({
      searchWord: empriseControl
    })

    empriseControl.valueChanges.pipe(
      takeUntil(this.destroyed$),
      filter(value => typeof value === 'string' && empriseControl.valid),
      switchMap((querry) => {
        return observerMerge(
          ...this.getQuerryForSerach(querry)
        ).pipe(
          catchError(() => { return EMPTY })
        )
      }),
      map((response) => {
        if (response.type == 'limites') {
          this.filterOptions['limites'] = new handleEmpriseSearch().formatDataForTheList(response.value)
        } else if (response.type == 'photon') {
          this.filterOptions['photon'] = new handlePhotonSearch().formatDataForTheList(response.value)
        } else if (response.type == 'adresseFr') {
          this.filterOptions['adresseFr'] = new handleAdresseFrSearch().formatDataForTheList(response.value)
        } else if (response.type == 'layer') {
          this.filterOptions['layer'] = new handleLayerSearch().formatDataForTheList(response.value)
        }
        this.cleanFilterOptions()
      })
    ).subscribe()

  }

  ngOnInit(): void {

  }

  ngOnDestroy() {
    this.destroyed$.next()
    this.destroyed$.complete()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.map) {
      if (this.map) {
        var cartoClass = new CartoHelper(this.map)
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
    }
  }

  /**
   * get querry for search
   * TO BE AMELIORATE WITH ENVIRONMENT VARIABLE
   * @param value string text to search
   */
  getQuerryForSerach(value: string): Observable<{ type: String, error: boolean, value: any }>[] {

    var querryObs:Observable<{ type: String, error: boolean, value: any }>[] = [

      this.searchLayerService.searchLayer(value).pipe(
        map((layer) => { return { type: 'layer', value: layer, error: false } }),
        catchError(() => { return EMPTY })
      )
    ]



    /** if we have extent of the project, search with photon in that extent */
    if (this.parametersService.parameter && this.parametersService.parameter.appExtent) {
      let appExtent = this.parametersService.parameter.appExtent
      var bboxPhoton = appExtent.a + ',' + appExtent.b + ',' + appExtent.c + ',' + appExtent.d

      querryObs.push(
        from(this.BackendApiService.getRequestFromOtherHost('https://photon.komoot.de/api/?&limit=7&q=' + value.toString() + "&lang=fr" + "&bbox=" + bboxPhoton)).pipe(
          map((val) => { return { type: 'photon', value: val, error: false } }),
          catchError((_err) => { return EMPTY }))
      )
    }


    querryObs.push(
      this.parametersService.searchAdminBoundary(value.toString()).pipe(
        map((val) => { return { type: 'limites', value: val, error: false } }),
        catchError((_err) => { return EMPTY }))
    )


    /**
     * if project is france, we add search for adresses of France
     */
    // if (environment.pojet_nodejs =='france') {
    querryObs.push(
      from(this.BackendApiService.getRequestFromOtherHost('https://api-adresse.data.gouv.fr/search/?limit=5&q=' + value.toString())).pipe(
        map((val) => { return { type: 'adresseFr', value: val, error: false } }),
        catchError((_err) => { return EMPTY })
      )
    )
    // }

    return querryObs
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
        new handleEmpriseSearch().optionSelected(option, this.map)
      } else if (option.typeOption == 'photon') {
        new handlePhotonSearch().optionSelected(option, this.map)
      } else if (option.typeOption == 'adresseFr') {
        new handleAdresseFrSearch().optionSelected(option, this.map)
      } else if (option.typeOption == 'layer') {
        new handleLayerSearch().optionSelected(option, this.map)
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
    var cartoClass = new CartoHelper(this.map)
    if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
      var searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]

      searchResultLayer.getSource().clear()
    }
  }

}
