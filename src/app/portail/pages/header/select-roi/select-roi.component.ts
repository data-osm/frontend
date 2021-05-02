import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { GeoJSON, Map } from '../../../../ol-module';
import { filter, sampleTime } from 'rxjs/operators';
import { geosignetsProjectInterface } from '../../../../type/type';
import { CartoHelper } from '../../../../../helper/carto.helper';
import { StorageServiceService } from '../../../../services/storage-service/storage-service.service';

@Component({
  selector: 'app-select-roi',
  templateUrl: './select-roi.component.html',
  styleUrls: ['./select-roi.component.scss']
})
/**
 * select an ROI
 */
export class SelectRoiComponent implements OnInit {

  @Input()map:Map
  /**
   * Control to manage user interaction while he change ROI
   */
  controlSelectRoi:FormControl = new FormControl()

  constructor(
    public storageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
    this.storageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.initialiseControlROI()
      }
    })

  }

  /**
   * initialise control search ROI
   */
  initialiseControlROI(){
    this.controlSelectRoi.valueChanges.pipe(
      filter(value=> typeof value == 'object')
    ).subscribe((value:geosignetsProjectInterface)=>{
      if (value) {
       this._zoomToRoi(value)
      }
    })

    for (let index = 0; index < this.storageServiceService.configProject.value.geosignetsProject.length; index++) {
      const roi = this.storageServiceService.configProject.value.geosignetsProject[index];
      if (roi.active) {
        this.controlSelectRoi.setValue(roi)
        setTimeout(()=>{
          this._zoomToRoi(roi)
        },1000)
      }
    }

  }
/**
 * Fit view on a ROI
 */
  _zoomToRoi(roi:geosignetsProjectInterface){
    var extent = new GeoJSON().readFeatures(JSON.parse(roi.geometry),{
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })[0].getGeometry().getExtent()

    new CartoHelper(this.map).fit_view(extent,10)
  }

}
