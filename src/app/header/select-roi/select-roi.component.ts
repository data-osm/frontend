import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { geosignetsProjectInterface } from 'src/app/type/type';
import { cartoHelper } from 'src/helper/carto.helper';
import { GeoJSON } from 'src/app/ol-module';
import { filter, sampleTime } from 'rxjs/operators';

@Component({
  selector: 'app-select-roi',
  templateUrl: './select-roi.component.html',
  styleUrls: ['./select-roi.component.scss']
})
/**
 * select an ROI
 */
export class SelectRoiComponent implements OnInit {

  /**
   * Control to manage user interaction while he change ROI
   */
  controlSelectRoi:FormControl = new FormControl()

  constructor(
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
    this.StorageServiceService.states.subscribe((value) => {
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

    for (let index = 0; index < this.StorageServiceService.configProject.value.geosignetsProject.length; index++) {
      const roi = this.StorageServiceService.configProject.value.geosignetsProject[index];
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

    new cartoHelper().fit_view(extent,10)
  }

}
