import { Component, OnInit, Inject, SimpleChanges, OnChanges } from '@angular/core';
import { coucheInterface, carteInterface } from 'src/app/type/type';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { ShareServiceService } from 'src/app/services/share-service/share-service.service'
import { layersInMap, cartoHelper } from 'src/helper/carto.helper';
import { manageCompHelper } from 'src/helper/manage-comp.helper';
import { environment } from 'src/environments/environment';
import { VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, Feature } from 'src/app/ol-module';
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
  coordinates_3857: [number, number]
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
   * VectorLayer of hightlight feature
   */
  highlightLayer: VectorLayer = new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      var color = '#f44336'
      return new Style({
        fill: new Fill({
          color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.7]
        }),
        stroke: new Stroke({
          color: color,
          width: 2
        }),
        image: new CircleStyle({
          radius: 11,
          stroke: new Stroke({
            color: color,
            width: 4
          }),
          fill: new Fill({
            color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.7]
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
    console.log(this.descriptiveModel.properties)
    var url = environment.url_frontend+'/map?'+this.ShareServiceService.shareFeature(
      this.descriptiveModel.layer.properties['type'],
      this.descriptiveModel.layer.properties['couche_id'],
      this.descriptiveModel.layer.properties['group_id'],
      this.descriptiveModel.coordinates_3857,
      this.descriptiveModel.properties?this.descriptiveModel.properties['featureId']:''
    )

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
