import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { debounceTime, filter, startWith, tap, map, skip, catchError, take, switchMap, takeUntil } from 'rxjs/operators';
import { from, Observable, fromEvent, merge as observerMerge, of, EMPTY, Subject, ReplaySubject, merge, BehaviorSubject } from 'rxjs';
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { configProjetInterface } from '../../../../type/type';
import { responseOfSearchPhotonInterface, responseOfSerachLimitInterface } from './interface-search'
import { handleEmpriseSearch } from './handle-emprise-search'
import { handlePhotonSearch } from './handle-photon-search'
import { handleAdresseFrSearch } from './handle-adresseFr-search'
import { handleLayerSearch } from './handle-layer-search'
import { Style, Fill, Stroke, CircleStyle, Icon, Text, GeoJSON, Point, getCenter } from '../../../../ol-module';
import { manageDataHelper } from '../../../../../helper/manage-data.helper';
import { CartoHelper } from '../../../../../helper/carto.helper';
import { MatLegacyAutocompleteSelectedEvent as MatAutocompleteSelectedEvent } from '@angular/material/legacy-autocomplete';
import { environment } from '../../../../../environments/environment';
import { SearchLayerService } from '../../../../data/services/search-layer.service';
import { ParametersService } from '../../../../data/services/parameters.service';
import { MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';

import {
  Map,
  VectorSource,
  ColorLayer,
  Instance
} from "../../../../giro-3d-module"

import { fromInstanceGiroEvent, fromMapGiroEvent } from '../../../../shared/class/fromGiroEvent';
import { fromOpenLayerEvent } from '../../../../shared/class/fromOpenLayerEvent';
import { Group, Vector2 } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { MatomoTracker } from 'ngx-matomo-client';
import { RequestFeedbackComponent } from '../../request-feedback/request-feedback.component';


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
  @Input() instance: Instance

  /**
   * forms use to choose emprise to make the download
   */
  form: UntypedFormGroup;
  /**
   * list of all filtterd option
   */
  filterOptions: { [key: string]: Array<filterOptionInterface> } = {
    adresseFr: [],
    limites: [],
    layer: [],
    photon: [],
  }

  labelGroup: Group = new Group()

  objectsIn = Object.keys

  /**
 * VectorLayer of search Result  and style
 */
  searchResultLayer: ColorLayer = new ColorLayer({
    name: "searchResultLayer",
    source: new VectorSource({
      data: [],
      dataProjection: 'EPSG:3857',

      // format: new GeoJSON(),
      // style: null,
      style: (feature) => {
        if (feature.getGeometry().getType() == "Point" || feature.getGeometry().getType() == "MultiPoint") {
          return null
        }
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
          // image: new Icon({
          //   scale: 0.7,
          //   src: '/assets/icones/marker-search.png'
          // }),
          // text: new Text(textStyle)
        })
      },
    }),
  });

  frameIndex$: BehaviorSubject<number> = new BehaviorSubject<number>(0)

  constructor(
    public fb: UntypedFormBuilder,
    public BackendApiService: BackendApiService,
    public searchLayerService: SearchLayerService,
    public parametersService: ParametersService,
    private readonly tracker: MatomoTracker,
    private dialog: MatDialog,
  ) {


    this.searchResultLayer.userData.type_layer = 'searchResultLayer'
    this.searchResultLayer.userData.nom = 'searchResultLayer'

    let empriseControl = new UntypedFormControl('', [Validators.minLength(2)])

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
        this.tracker.trackSiteSearch(empriseControl.value, response.type, response.value.length)
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

  requestUserFeedback() {

    setTimeout(() => {
      const isFeedbackRequested = environment.production ? localStorage.getItem('isFeedbackRequested') == 'true' : false
      if (CartoHelper.isMobile() == false && this.frameIndex$.getValue() >= 200 && isFeedbackRequested == false) {
        localStorage.setItem('isFeedbackRequested', "true")

        let properties: MatDialogConfig = {
          disableClose: false,
          minWidth: 450,
          maxHeight: 460,
          width: '400px',
          hasBackdrop: false,
          autoFocus: true,
          panelClass: ['feedback-modal'],
          position: {
            bottom: '10px',
            left: '10px',
          }
        }
        this.dialog.open(RequestFeedbackComponent, properties)
      }
    }, environment.production ? 5000 : 0)
  }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.instance) {
      if (this.instance) {

        fromInstanceGiroEvent(this.instance, "update-end").pipe(
          takeUntil(this.destroyed$),
          map((e) => {
            this.frameIndex$.next(e.frame)
          })
        ).subscribe()

        this.labelGroup.name = "searchResultGroup"
        this.map["_instance"].add(this.labelGroup)

        var cartoClass = new CartoHelper(this.map)

        fromMapGiroEvent<"layer-order-changed">(this.map, "layer-order-changed").pipe(
          filter(_ => this.map.getLayers((layer) => layer.name == "searchResultLayer").length > 0),
          debounceTime(1000),
          tap(() => {
            let searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]
            cartoClass.moveLayerOnTop(searchResultLayer)
          })
        ).subscribe()
        if (cartoClass.getLayerByName('searchResultLayer').length == 0) {
          from(this.map.addLayer(this.searchResultLayer)).pipe(
            take(1),
            tap((layer) => {
              cartoClass.moveLayerOnTop(layer)
              const source = layer.source as VectorSource
              merge(
                fromOpenLayerEvent(source.source, "clear"),
                fromOpenLayerEvent(source.source, "addfeature")
              ).pipe(
                tap(() => {
                  this.labelGroup.clear()
                  for (const feature of source.source.getFeatures()) {

                    const div = document.createElement('div');
                    const text = document.createElement('div');
                    const image = document.createElement('img');
                    div.appendChild(image)
                    div.appendChild(text)
                    // Virtually any inner markup is supported, here we're just inserting text
                    div.style.textAlign = "center"
                    text.innerText = feature.get('textLabel');

                    image.src = "/assets/icones/marker-search.png"
                    image.style.height = "30px"

                    // Any CSS style is supported
                    text.style.color = '#ffffff';
                    text.style.padding = '0.2em 1em';
                    text.style.maxWidth = '200px';
                    text.style.border = '2px solid #cccccc';
                    text.style.backgroundColor = '#080808';
                    text.style.textAlign = 'center';
                    text.style.opacity = "0.8";


                    const feature_coordinates = getCenter(feature.getGeometry().getExtent())
                    const position = new Vector2(feature_coordinates[0], feature_coordinates[1])

                    // Create our label and position it
                    const label = new CSS2DObject(div);

                    label.position.set(position.x, position.y, 0);
                    label.updateMatrixWorld();

                    // Simply add it to our instance
                    this.labelGroup.add(label)





                  }
                  this.map["_instance"].notifyChange(layer);

                })
              ).subscribe()

            })
          ).subscribe()
        }

        if (cartoClass.getLayerByName('searchResultLayer').length > 0) {
          let searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]
          const source = searchResultLayer.source as VectorSource
          source.source.clear()
          cartoClass.moveLayerOnTop(searchResultLayer)
        }
      }
    }
  }

  /**
   * get querry for search
   * TO BE AMELIORATE WITH ENVIRONMENT VARIABLE
   * @param value string text to search
   */
  getQuerryForSerach(value: string): Observable<{ type: string, error: boolean, value: Array<any> }>[] {

    var querryObs: Observable<{ type: string, error: boolean, value: any }>[] = [

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

      this.tracker.trackSiteSearch(option.name, option.typeOption)
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
      this.requestUserFeedback()
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
      let searchResultLayer = cartoClass.getLayerByName('searchResultLayer')[0]
      const source = searchResultLayer.source as VectorSource
      source.source.clear()
    }
  }

}
