import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { modelDescriptiveSheet } from '../descriptive-sheet.component';
import { manageDataHelper } from 'src/helper/manage-data.helper'
import { ImageWMS, TileWMS, GeoJSON } from 'src/app/ol-module';
import { cartoHelper } from 'src/helper/carto.helper'
import { BackendApiService } from 'src/app/services/backend-api/backend-api.service'
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { NotifierService } from "angular-notifier";
import { retryWhen, tap, delayWhen, take } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { timer } from 'rxjs';
import { ShareServiceService } from 'src/app/services/share-service/share-service.service'
import {measureUtil} from 'src/utils/measureUtils'
export interface attributeInterface {
  field: string,
  value: string,
  display: boolean
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
export class OsmSheetComponent implements OnInit,OnChanges {

  @Input() descriptiveModel: modelDescriptiveSheet

  /**
   * update descriptiveModel
   */
  @Output() updatemMdelDescriptiveSheet: EventEmitter<modelDescriptiveSheet> = new EventEmitter()

  @Output() closeDescriptiveSheet: EventEmitter<any> = new EventEmitter()

  /**
   * List of all attributes that will be display
   */
  listAttributes: attributeInterface[] = []

  /**
   * Name of the feature
   */
  name: string = undefined

  /**
   * Adresse of the feature if exist
   */
  adresse:string


  /**
  * osm id of the feature
  */
  osmId: number = undefined

  /**
   * OSM link of a feature in osm.org
   */
  osmUrl: string

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
  initialNumberOfAttributes:number = 5

  private readonly notifier: NotifierService;

  configTagsOsm: {
    [key: string]: {
      /**
       * display attribute or not
       */
      display:boolean,
      /**
       * type of config
       * url, image,tel
       */
      type: string,
      header:string
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

  constructor(
    public BackendApiService: BackendApiService,
    public StorageServiceService: StorageServiceService,
    notifierService: NotifierService,
  ) {
    this.notifier = notifierService;
  }

  async ngOnInit() {
    /** load configuration to display tags */
    await this.BackendApiService.getRequestFromOtherHost('/assets/config/config_tags.json').then(
      (response) => {
        this.configTagsOsm = response
      }
    )

    if (this.descriptiveModel.properties) {
      this.formatFeatureAttributes()
    } else {
      this.getPropertiesFromCartoServer()
    }

    this.descriptiveModel.getShareUrl = function (environment,ShareServiceService:ShareServiceService) {
      return environment.url_frontend+'/map?'+ShareServiceService.shareFeature(
        this.layer.properties['type'],
        this.layer.properties['couche_id'],
        this.layer.properties['group_id'],
        this.coordinates_3857,
        this.properties['osm_id']
      )
    }

    this.updatemMdelDescriptiveSheet.emit(this.descriptiveModel)

  }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    // setTimeout(() => {
    //   console.log(changes.descriptiveModel.currentValue)
    //   this.updatemMdelDescriptiveSheet.emit(this.descriptiveModel)
    // }, 1000);

  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.name = undefined
    this.osmId = undefined
    this.osmUrl = undefined
    this.initialNumberOfAttributes = 5

  }

  /**
   * get properties of a feature from the carto server
   */
  getPropertiesFromCartoServer() {
    if (this.descriptiveModel.layer.layer.getSource() instanceof ImageWMS || this.descriptiveModel.layer.layer.getSource() instanceof TileWMS) {

      this.loading.properties = true
      var url = this.descriptiveModel.layer.layer.getSource().getFeatureInfoUrl(
        this.descriptiveModel.coordinates_3857,
        new cartoHelper().map.getView().getResolution(),
        "EPSG:3857"
      ) + "&WITH_GEOMETRY=true&FI_POINT_TOLERANCE=30&FI_LINE_TOLERANCE=10&FI_POLYGON_TOLERANCE=10&INFO_FORMAT=application/json"

          this.BackendApiService.getRequestFromOtherHostObserver(url)
          .pipe(
            /** retry 3 times after 2s if querry failed  */
            retryWhen(errors=>
              errors.pipe(
                tap((val:HttpErrorResponse) => {
                  // console.log(val)
                }),
                delayWhen((val:HttpErrorResponse) => timer(2000)),
                // delay(2000),
                take(3)
              )
            )
          ).subscribe(
            (response: any) => {
              this.loading.properties = false
              try {
                var features = new GeoJSON().readFeatures(response, {
                  // dataProjection: 'EPSG:4326',
                  // featureProjection: 'EPSG:3857'
                });

                if (features.length > 0) {
                  var properties = features[0].getProperties()
                  var geometry = features[0].getGeometry()
                  this.descriptiveModel.properties = properties
                  this.descriptiveModel.geometry = geometry
                  this.updatemMdelDescriptiveSheet.emit(this.descriptiveModel)

                  this.formatFeatureAttributes()
                } else {
                  this.closeDescriptiveSheet.emit()
                }

              } catch (error) {
                this.notifier.notify("error", "un problème est survenue lors du traitement des informations du serveur cartograohique");
              }

            },
            (error) => {
              this.loading.properties = false
              this.notifier.notify("error", "Impossible de recuperer les informations du serveur cartograohique");

            }
          )


    }
  }

  /**
   * Format feature attributes
   */
  formatFeatureAttributes() {
    this.listAttributes = []

    if (this.descriptiveModel.properties['name']) {
      this.name = this.descriptiveModel.properties['name']
    }

    if (this.descriptiveModel.properties['osm_id']) {
      this.osmId = this.descriptiveModel.properties['osm_id']
      this.getOsmLink()
    }

    if (this.descriptiveModel.properties['hstore_to_json'] && typeof this.descriptiveModel.properties['hstore_to_json'] == 'object') {
      for (const key in this.descriptiveModel.properties['hstore_to_json']) {
        if (this.descriptiveModel.properties['hstore_to_json'].hasOwnProperty(key) && ['osm_user', 'osm_changeset', 'osm_timestamp', 'osm_version', "osm_uid","featureId"].indexOf(key) == -1) {
          const value = this.descriptiveModel.properties['hstore_to_json'][key];

          this.listAttributes.push({
            field: key,
            value: value,
            display: true
          })

        }
      }
    }


    for (const key in this.descriptiveModel.properties) {

      if (this.descriptiveModel.properties.hasOwnProperty(key) &&
        this.descriptiveModel.properties[key] &&
        ['number', 'string'].indexOf(typeof this.descriptiveModel.properties[key]) != -1 &&
        ['fid', 'osm_id', 'name', 'gid', "osm_uid","featureId"].indexOf(key) == -1
      ) {

        const value = this.descriptiveModel.properties[key];

        var positionOfKeyInListAttribute = manageDataHelper.isAttributesInObjectOfAnArray(this.listAttributes, key, value)
        if (positionOfKeyInListAttribute) {
          this.listAttributes.splice(positionOfKeyInListAttribute, 1, {
            field: key,
            value: value,
            display: true
          })
        } else {
          this.listAttributes.push({
            field: key,
            value: value,
            display: true
          })
        }



      }
    }

    this.constructAdresse()

  }

  /**
   * find OSM link of this feature
   * @return string
   */
  getOsmLink() {
    if (this.osmId) {
      this.loading.osmUrl = true
      var url =
        "https://nominatim.openstreetmap.org/lookup?osm_ids=R" +
        Math.abs(this.osmId) +
        ",W" +
        Math.abs(this.osmId) +
        ",N" +
        Math.abs(this.osmId) +
        "&format=json";

      this.BackendApiService.getRequestFromOtherHost(url).then(
        (response: any) => {
          this.loading.osmUrl = false
          if (response.length > 0) {
            var osm_type = response[0].osm_type;
            var osm_id = response[0].osm_id;
            this.osmUrl = "https://www.openstreetmap.org/" + osm_type + "/" + osm_id;

            if (osm_type == "relation") {
              var osm_type_small = "R";
            } else if (osm_type == "way") {
              var osm_type_small = "W";
            } else if (osm_type == "node") {
              var osm_type_small = "N";
            }

          }
        },
        (error) => {
          this.loading.osmUrl = false
        }
      )
    }
  }


  /**
   * construct adresse of the feature osm if exist
   */
  constructAdresse() {
    var count_adresse = 0
    var adresse = {
      "housenumber": undefined,
      "street": undefined,
      "city": '',
      "postcode": '',
    }

    for (let index = 0; index < this.listAttributes.length; index++) {
      const element = this.listAttributes[index];
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
      this.adresse = adresse.housenumber + ' ' + adresse.street + ' ' + adresse.city + ' ' + adresse.postcode
    }
  }

  /**
   * Format area
   * @param area
   */
  formatArea(area):string{
    var intArea = parseInt(area)
    var unit:"sqm" | "hectar" | "sqkm" | "sqft" | "sqmi" = 'sqm'
    var unitHuman = 'm²'
    if (area > 1000) {
      unit = 'hectar'
      unitHuman = 'hectare'
    }

    if (area > 100000000) {
      unit = 'sqkm'
      unitHuman = 'Km²'
    }

    return Math.round((new measureUtil().getFormattedArea(unit,area) + Number.EPSILON) * 100) / 100+' '+unitHuman
  }

  openUrl(url) {
    window.open(url, '_blank')
  }

  /**
   * alert value
   * @param value string
   */
  alertValue(value:string){
    alert(value)
  }

}
