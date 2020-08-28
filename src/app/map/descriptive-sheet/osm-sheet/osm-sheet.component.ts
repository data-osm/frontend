import { Component, OnInit, Input } from '@angular/core';
import { modelDescriptiveSheet } from '../descriptive-sheet.component';
import {manageDataHelper} from 'src/helper/manage-data.helper'
import { ImageWMS, TileWMS, GeoJSON } from 'src/app/ol-module';
import {cartoHelper} from 'src/helper/carto.helper'
import {BackendApiService} from 'src/app/services/backend-api/backend-api.service'
import { NotifierService } from "angular-notifier";

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
 */
export class OsmSheetComponent implements OnInit {

  @Input() descriptiveModel: modelDescriptiveSheet

  /**
   * List of all attributes that will be display
   */
  listAttributes:attributeInterface[] = []

  /**
   * Name of the feature
   */
  name:string = undefined


   /**
   * osm id of the feature
   */
  osmId:number = undefined

  /**
   * loading
   */
  loading:{
    properties:boolean,
    geometry:boolean
  }= {
    properties:false,
    geometry:false
  }

  private readonly notifier: NotifierService;

  constructor(
    public BackendApiService:BackendApiService,
    notifierService: NotifierService,
  ) {
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    if (this.descriptiveModel.properties) {
      this.formatFeatureAttributes()
    }else{
      this.getPropertiesFromCartoServer()
    }
  }

  /**
   * get properties of a feature from the carto server ImageWMS
   */
  getPropertiesFromCartoServer(){
    if (this.descriptiveModel.layer.layer.getSource() instanceof ImageWMS || this.descriptiveModel.layer.layer.getSource() instanceof TileWMS ) {

      this.loading.properties = true
      var url = this.descriptiveModel.layer.layer.getSource().getFeatureInfoUrl(
        this.descriptiveModel.coordinates_3857,
        new cartoHelper().map.getView().getResolution(),
        "EPSG:3857"
        )+ "&FI_POINT_TOLERANCE=30&INFO_FORMAT=application/json"

      this.BackendApiService.getRequestFromOtherHost(url).then(
        (response:any)=>{
          this.loading.properties = false

          try {
            var features = new GeoJSON().readFeatures(response, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            });

            if(features.length > 0){
              var properties = features[0].getProperties()
              this.descriptiveModel.properties = properties
              this.formatFeatureAttributes()
            }

          } catch (error) {
            this.notifier.notify("error", "un problème est survenue lors du traitement des informations du serveur cartograohique");

          }

        },
        (error)=>{
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
    }

    if (this.descriptiveModel.properties['hstore_to_json'] && typeof this.descriptiveModel.properties['hstore_to_json'] == 'object') {
      for (const key in this.descriptiveModel.properties['hstore_to_json']) {
        if (this.descriptiveModel.properties['hstore_to_json'].hasOwnProperty(key) && ['osm_user','osm_changeset','osm_timestamp','osm_version',"osm_uid"].indexOf(key) == -1 ) {
          const value = this.descriptiveModel.properties['hstore_to_json'][key];

          this.listAttributes.push({
            field:key,
            value:value,
            display:true
          })

        }
      }
    }


    for (const key in this.descriptiveModel.properties) {

      if (this.descriptiveModel.properties.hasOwnProperty(key) &&
          this.descriptiveModel.properties[key] &&
          ['number','string'].indexOf(typeof this.descriptiveModel.properties[key]) != -1 &&
          ['fid','osm_id','name','gid',"osm_uid"].indexOf(key) == -1
        ) {

        const value = this.descriptiveModel.properties[key];

        var positionOfKeyInListAttribute = manageDataHelper.isAttributesInObjectOfAnArray(this.listAttributes,key,value)
        if (positionOfKeyInListAttribute) {
          this.listAttributes.splice(positionOfKeyInListAttribute,1,{
            field:key,
            value:value,
            display:true
          })
        }else{
          this.listAttributes.push({
            field:key,
            value:value,
            display:true
          })
        }



      }
    }

    console.log(this.listAttributes)
  }

}
