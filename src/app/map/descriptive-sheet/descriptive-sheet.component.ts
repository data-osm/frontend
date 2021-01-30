import { Component, OnInit, Inject, SimpleChanges, OnChanges } from '@angular/core';
import { coucheInterface, carteInterface } from '../../../app/type/type';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StorageServiceService } from '../../../app/services/storage-service/storage-service.service'
import { ShareServiceService } from '../../../app/services/share-service/share-service.service'
import { layersInMap, cartoHelper } from '../../../helper/carto.helper';
import { manageCompHelper } from '../../../helper/manage-comp.helper';
import { environment } from '../../../environments/environment';
import { VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, Feature } from '../../../app/ol-module';
import { constructor } from 'moment';

/**
 * interface of the model to display a sheet properties
 */
export interface modelDescriptiveSheet {
  type: string,
  /**
   * layer
   */
  layer: layersInMap
  /**
   * ol geometry
   */
  geometry?: any
  /**
   * Properties to displqy
   */
  properties: Object,
  coordinates_3857: [number, number],
  getShareUrl?:(environment,ShareServiceService:ShareServiceService)=>string
}

@Component({
  selector: 'app-descriptive-sheet',
  templateUrl: './descriptive-sheet.component.html',
  styleUrls: ['./descriptive-sheet.component.scss']
})
/**
 * Dislplay different descriptive sheet
 * - osm type
 */
export class DescriptiveSheetComponent implements OnInit,OnChanges {

  /**
   * path of the image of layer
   */
  imgSrc: string

  /**
   * VectorLayer of hightlight feature and style
   */
  highlightLayer: VectorLayer = new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      var color = '#f44336'
      return new Style({
        fill: new Fill({
          color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
        }),
        stroke: new Stroke({
          color: color,
          width: 6
        }),
        image: new CircleStyle({
          radius: 11,
          stroke: new Stroke({
            color: color,
            width: 4
          }),
          fill: new Fill({
            color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
          })
        })
      })
    },
    type_layer: 'highlightFeature',
    nom: 'highlightFeature'
  });


  constructor(
    @Inject(MAT_DIALOG_DATA) public descriptiveModel: modelDescriptiveSheet,
    public dialogRef: MatDialogRef<DescriptiveSheetComponent>,
    public StorageServiceService: StorageServiceService,
    public manageCompHelper:manageCompHelper,
    public ShareServiceService:ShareServiceService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    if (this.descriptiveModel.geometry) {
      this.loadGeometryInHightLightLayer()
    }
    // console.log(this.paramsShare)

  }

  /**
   * update descriptiveModel
   * @param data modelDescriptiveSheet
   */
  setSescriptiveModel(data:modelDescriptiveSheet){
    this.descriptiveModel = data
    if (this.descriptiveModel.geometry) {
      this.loadGeometryInHightLightLayer()
    }
  }


  ngOnInit(): void {

    this.initialiseHightLightMap()

    if (this.descriptiveModel.layer.properties['type'] == 'couche') {
      this.imgSrc = environment.url_prefix + this.StorageServiceService.getCouche(this.descriptiveModel.layer.properties['group_id'], this.descriptiveModel.layer.properties['couche_id']).img
    } else if (this.descriptiveModel.layer.properties['type'] == 'carte') {
      this.imgSrc = environment.url_prefix + this.StorageServiceService.getCarte(this.descriptiveModel.layer.properties['group_id'], this.descriptiveModel.layer.properties['couche_id']).image_src
    }

    if (this.descriptiveModel.geometry) {
      this.loadGeometryInHightLightLayer()
    }

  }

  /**
   * add geometry of this feature in the hightlight layer
   */
  loadGeometryInHightLightLayer() {
    if (this.descriptiveModel.geometry) {
      var feature = new Feature()
      feature.setGeometry(this.descriptiveModel.geometry)

      var cartoClass = new cartoHelper()

      this.highlightLayer.getSource().addFeature(feature)
    }
  }

  /**
   * Initialise hightLight layer in the map
   */
  initialiseHightLightMap() {
    var cartoClass = new cartoHelper()
    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      this.highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
      this.highlightLayer.setZIndex(1000)
    } else {
      this.highlightLayer.setZIndex(1000)
      cartoClass.map.addLayer(this.highlightLayer)
    }

    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      cartoClass.getLayerByName('highlightFeature')[0].getSource().clear()
    }

  }

  /**
   * Close modal
   */
  closeModal(): void {
    var cartoClass = new cartoHelper()

    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      cartoClass.getLayerByName('highlightFeature')[0].getSource().clear()
    }

    this.dialogRef.close();
  }

  /**
   * Share this feature
   */
  shareFeature(){
    var url =  this.descriptiveModel.getShareUrl(environment,this.ShareServiceService)
    this.manageCompHelper.openSocialShare(
      url
    )
  }

  /**
   * Zoom on feature extent
   */
  zoomOnFeatureExtent(){
    if (this.descriptiveModel.geometry) {
      var extent = this.descriptiveModel.geometry.getExtent()
      var cartoClass = new cartoHelper()
      cartoClass.fit_view(extent,16)
    }
  }

  /**
 * Covert a color from hex to rgb
 * @param hex string
 * @return  {r: number, g: number, b: number }
 */
  hexToRgb(hex: string): { r: number, g: number, b: number } {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

}
