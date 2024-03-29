import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, ViewChild, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { manageDataHelper } from '../../../../../helper/manage-data.helper'
import { ImageWMS, TileWMS, GeoJSON, VectorLayer, Map, Coordinate } from '../../../../ol-module';
import { CartoHelper } from '../../../../../helper/carto.helper'
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { NotifierService } from "angular-notifier";
import { retryWhen, tap, delayWhen, take, switchMap, map, toArray, shareReplay, debounceTime, filter, startWith, withLatestFrom } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { concat, ReplaySubject, Subject, timer, Observable, of, interval } from 'rxjs';
import { ShareServiceService } from '../../../../services/share-service/share-service.service'
import { measureUtil } from '../../../../../utils/measureUtils'
import { Feature } from 'ol';
import { Group, Layer } from '../../../../type/type';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { MatChip, MatChipList } from '@angular/material/chips';
import { Extent } from 'ol/extent';
import { FeatureForSheet } from '../descriptive-sheet.component';
import { environment } from '../../../../../environments/environment';
// import * as OpeningHoursParser from './OpeningHoursParser.js';

declare var OpeningHoursParser: any;

export interface Week {
  _intervals: Array<Interval>
  getIntervals: () => Array<Interval>
}

export interface Day {
  _intervals: Array<Interval>
  getIntervals: () => Array<Interval>
}

export interface Interval {
  getEndDay: () => number
  getFrom: () => number
  getStartDay: () => number
  getTo: () => number
}

export interface DateRange {
  getTypical: () => Week | Day
}

export interface AttributeInterface {
  field: string,
  value: string,
  display: boolean
}

export interface ConfigTagsOsm {
  [key: string]: {
    /**
     * display attribute or not
     */
    display: boolean,
    /**
     * type of config
     * url, image,tel
     */
    type: string,
    header: string
    /**
     * url to insert before the value
     */
    prefix?: string,
    /**
     * url to insert before the value
     */
    surfix?: string,
    /**
     * replace original value with a symbol (icon, color)
     */
    values?: { [key: string]: Object }
  }
}

@Component({
  selector: 'app-osm-sheet',
  templateUrl: './osm-sheet.component.html',
  styleUrls: ['./osm-sheet.component.scss']
})
/**
 * display attributes of an openlayers feature
 * if properties does not exist on descriptiveModel, go find it with wms feature info
 * if geometry does not exist on descriptiveModel, go find it with wms feature info of wfs
 *
 * @todo create a general class
 */
export class OsmSheetComponent implements OnInit, OnChanges {

  public onInitInstance: () => void
  environment = environment
  /**
   * Openlayer layer to highlight the feature on the map
   */
  @Input() highlightLayer: VectorLayer
  @Input() map: Map
  // @Input() feature: Feature
  /**
   * Coordiante at pixel where the user clicked
   */
  @Input() coord: Coordinate
  @Input() dataOsmLAyer: {
    group: Group;
    layer: Layer;
  }
  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  @Input() features: FeatureForSheet[]

  /**
   * loading
   */
  loading: {
    properties: boolean,
    osmUrl: boolean
  } = {
      properties: false,
      osmUrl: false
    }

  /**
   * number of initial number of attributes that can be display
   */
  initialNumberOfAttributes: number = 5

  private readonly notifier: NotifierService;

  configTagsOsm$: Observable<ConfigTagsOsm>

  @ViewChild(MatChipList) matChipList: MatChipList

  /**
   * extent of the current feature, if the user want to zoom on int
   */
  extent: Extent

  /**
   * Feature to display
   */
  featureToDisplay$: Observable<AttributeInterface[]>

  /**
   * selected feature to display
   */
  selectedFeature: FeatureForSheet

  /**
   * Osm url of selected feature
   */
  osm_url: string



  listenToChipsChanged(matChipList: MatChipList) {
    this.featureToDisplay$ = matChipList.chipSelectionChanges.pipe(
      // startWith(matChipList.value),
      filter((value) => value.selected),
      map((chipChnaged) => {
        let feature: FeatureForSheet = chipChnaged.source.value
        this.selectedFeature = feature

        if (feature.getGeometry()) {
          this.extent = feature.getGeometry().getExtent()
        }else{
          this.extent = undefined
        }
        this.highlightLayer.getSource().clear()
        this.getOsmLink(feature)
        setTimeout(() => {
          this.highlightLayer.getSource().addFeature(feature)
        }, 500);
        return this.formatFeatureAttributes(feature)
      }),
      shareReplay(1)
    )



  }

  constructor(
    public BackendApiService: BackendApiService,
    notifierService: NotifierService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {
    this.notifier = notifierService;
    this.initialNumberOfAttributes = 5

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.configTagsOsm$ = onInit.pipe(
      take(1),
      switchMap(() => {
        return this.http.get<ConfigTagsOsm>('/assets/config/config_tags.json')
      }),
      tap(() => {
        this.listenToChipsChanged(this.matChipList)
        /**
         * if after 500ms, no chips is selected (idk why this happens)
         */
        this.matChipList.chips.changes.pipe(
          startWith(undefined),
          // take(1),
          debounceTime(500),
          filter(() => this.matChipList.chips.length > 0),
          tap(() => {
            this.toggleSelection(this.matChipList.chips.first)
          }),
        ).subscribe()
      })
    )

  }

  toggleSelection(chip: MatChip) {
    chip.toggleSelected();
    this.cdRef.detectChanges();
  }

  async ngOnInit() {


  }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    if (changes.dataOsmLAyer) {
      if (this.dataOsmLAyer && this.features.length > 0) {
        this.onInitInstance()

      }
    }

  }

  ngOnDestroy(): void {


  }

  ngAfterViewInit() {

  }


  /**
   * Format feature attributes
   */
  formatFeatureAttributes(feature: Feature): AttributeInterface[] {
    let listAttributes = []
    let properties = feature.getProperties()

    if (properties['hstore_to_json']) {
      let values_hstore_to_json: AttributeInterface[] = []
      if (typeof properties['hstore_to_json'] === 'object') {
        values_hstore_to_json = this._formatHtsore(properties['hstore_to_json'])

      } else if (typeof properties['hstore_to_json'] === 'string') {
        let stringToJson = function (myString) {
          let myObject = {}
          for (let index = 0; index < myString.split(',').length; index++) {
            const element = myString.split(',')[index];
            myObject[element.split(': ')[0].replace(/\s/, '')] = element.split(': ')[1]
          }
          return JSON.stringify(myObject)
        }

        try {

          let objetHstore = JSON.parse(stringToJson(properties['hstore_to_json']))

          values_hstore_to_json = this._formatHtsore(objetHstore)
        } catch (error) {
          console.error(error, stringToJson(properties['hstore_to_json']))
          values_hstore_to_json = []
        }
      }
      for (let index = 0; index < values_hstore_to_json.length; index++) {
        const element = values_hstore_to_json[index];
        listAttributes.push({
          field: element.field,
          value: element.value,
          display: element.display
        })
      }

    }


    for (const key in properties) {

      if (properties.hasOwnProperty(key) &&
        properties[key] &&
        ['number', 'string'].indexOf(typeof properties[key]) != -1 &&
        ['fid', 'osm_id', 'name', 'gid', "osm_uid", "featureId"].indexOf(key) == -1
      ) {

        const value = properties[key];

        var positionOfKeyInListAttribute = manageDataHelper.isAttributesInObjectOfAnArray(listAttributes, key, value)
        if (positionOfKeyInListAttribute) {
          listAttributes.splice(positionOfKeyInListAttribute, 1, {
            field: key,
            value: value,
            display: true
          })
        } else {
          listAttributes.push({
            field: key,
            value: value,
            display: true
          })
        }



      }
    }

    return listAttributes

  }

  _formatHtsore(hstore_to_json: Object): AttributeInterface[] {
    let values: AttributeInterface[] = []
    for (const key in hstore_to_json) {
      if (hstore_to_json.hasOwnProperty(key) && ['osm_user', 'osm_changeset', 'osm_timestamp', 'osm_version', "osm_uid", "featureId"].indexOf(key) == -1) {
        const value = hstore_to_json[key];

        values.push({
          field: key,
          value: value,
          display: true
        })

      }
    }
    return values
  }

  getNameOfFeature(feature: Feature, index: number): string {
    let properties = feature.getProperties()
    if (properties['name']) {
      return properties['name']
    } else {
      return "Entité " + index
    }
  }

  /**
   * find OSM link of this feature
   * @return string
   */
  getOsmLink(feature: Feature) {
    let properties = feature.getProperties()

    if (properties['osm_id']) {
      let osm_id = properties['osm_id']
      this.loading.osmUrl = true
      var url =
        "https://nominatim.openstreetmap.org/lookup?osm_ids=R" +
        Math.abs(osm_id) +
        ",W" +
        Math.abs(osm_id) +
        ",N" +
        Math.abs(osm_id) +
        "&format=json";

      this.http.get(url).pipe(
        take(1),
        map((response: any) => {
          if (response.length > 0) {
            var osm_type = response[0].osm_type;
            var osm_id = response[0].osm_id;
            this.osm_url = "https://www.openstreetmap.org/" + osm_type + "/" + osm_id;
          } else {
            this.osm_url = undefined
          }
        })
      ).subscribe()

    } else {
      this.osm_url = undefined
    }
  }

  constructOpeningHOurs(opening_hours: string): {
    mo: string[];
    tu: string[];
    we: string[];
    th: string[];
    fr: string[];
    sa: string[];
    su: string[];
  } {

    function pad(num) {
      return ("0" + num).slice(-2);
    }
    function hhmmss(secs) {
      var minutes = Math.floor(secs / 60);
      secs = secs % 60;
      var hours = Math.floor(minutes / 60)
      minutes = minutes % 60;
      return `${pad(minutes)}h${pad(secs)}`;
      // return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
      // return pad(hours)+":"+pad(minutes)+":"+pad(secs); for old browsers
    }
    var checker = new OpeningHoursParser();
    // opening_hours='12:00-14:30,19:00-22:30'
    try {
      let dateRanges: Array<DateRange> = checker.parse(opening_hours.trim())
      let intervals: Interval[] = dateRanges[0].getTypical().getIntervals()
      let response = {
        mo: intervals.filter((interval) => interval && interval.getStartDay() == 0).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        tu: intervals.filter((interval) => interval && interval.getStartDay() == 1).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        we: intervals.filter((interval) => interval && interval.getStartDay() == 2).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        th: intervals.filter((interval) => interval && interval.getStartDay() == 3).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        fr: intervals.filter((interval) => interval && interval.getStartDay() == 4).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        sa: intervals.filter((interval) => interval && interval.getStartDay() == 5).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        su: intervals.filter((interval) => interval && interval.getStartDay() == 6).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
      }
      return response

    } catch (error) {
      console.error(error)
      return
    }
  }

  /**
   * construct adresse of the feature osm if exist
   */
  constructAdresse(listAttributes: AttributeInterface[]): string {
    var count_adresse = 0
    var adresse = {
      "housenumber": undefined,
      "street": undefined,
      "city": '',
      "postcode": '',
    }

    for (let index = 0; index < listAttributes.length; index++) {
      const element = listAttributes[index];
      if (element.field == "addr:city") {
        count_adresse = count_adresse + 1
        adresse.city = element.value
      }
      if (element.field == "addr:street") {
        count_adresse = count_adresse + 1
        adresse.street = element.value
      }
      if (element.field == "addr:housenumber") {
        count_adresse = count_adresse + 1
        adresse.housenumber = element.value
      }
      if (element.field == "addr:postcode") {
        count_adresse = count_adresse + 1
        adresse.postcode = element.value
      }
    }
    if (adresse.housenumber && adresse.street) {
      return adresse.housenumber + ' ' + adresse.street + ' ' + adresse.city + ' ' + adresse.postcode
      // this.adresse = adresse.housenumber + ' ' + adresse.street + ' ' + adresse.city + ' ' + adresse.postcode
    }
  }

  /**
   * Format area
   * @param area
   */
  formatArea(area): string {
    var intArea = parseFloat(area)
    var unit: "sqm" | "hectar" | "sqkm" | "sqft" | "sqmi" = 'sqm'
    var unitHuman = 'm²'
    if (area > 10000) {
      unit = 'hectar'
      unitHuman = 'hectare'
    }

    if (area > 100000000) {
      unit = 'sqkm'
      unitHuman = 'Km²'
    }

    return Math.round((new measureUtil().getFormattedArea(unit, intArea) + Number.EPSILON) * 100) / 100 + ' ' + unitHuman
  }

  openUrl(url) {
    console.log(url)
    window.open(url, '_blank')
  }

  /**
   * alert value
   * @param value string
   */
  alertValue(value: string) {
    console.log(value)
    alert(value)
  }

/**
* Zoom on feature extent
*/
  zoomOnFeatureExtent() {
    console.log(this.extent)
    if (this.extent) {
      var cartoClass = new CartoHelper(this.map)
      cartoClass.fit_view(this.extent, 16)
    }
  }

}
