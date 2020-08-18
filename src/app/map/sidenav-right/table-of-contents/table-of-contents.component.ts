import { Component, OnInit, Input } from '@angular/core';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { Observable, fromEvent,merge as observerMerge } from 'rxjs';

import {cartoHelper, layersInMap} from 'src/helper/carto.helper'
import {manageCompHelper} from 'src/helper/manage-comp.helper'
import {
  Map
} from '../../../ol-module';
import {StorageServiceService} from 'src/app/services/storage-service/storage-service.service'
import {ShareServiceService} from 'src/app/services/share-service/share-service.service'
import { MatSliderChange } from '@angular/material/slider';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { map, catchError, debounceTime } from 'rxjs/operators';
import { coucheInterface, carteInterface } from 'src/app/type/type';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { MetadataComponent } from 'src/app/modal/metadata/metadata.component';

@Component({
  selector: 'app-table-of-contents',
  templateUrl: './table-of-contents.component.html',
  styleUrls: ['./table-of-contents.component.scss']
})
/**
 * Composnent of table of contents for handle layers
 */
export class TableOfContentsComponent implements OnInit {

  @Input() map:Map

  layersInToc:Array<layersInMap> = []
  layerChange:Observable<any> = new Observable()

  constructor(
    public StorageServiceService:StorageServiceService,
    public dialog: MatDialog,
    public ShareServiceService:ShareServiceService,
    public manageCompHelper:manageCompHelper
  ) { }

  ngOnInit(): void {

    this.map.getLayers().on('propertychange',(ObjectEvent)=>{

      this.getAllLayersForTOC()
    })
  }

  /**
   * Construct the array this.layersInToc array.
   */
  getAllLayersForTOC(){
    let cartoHelperClass =  new cartoHelper()

    let reponseLayers:Array<layersInMap> = cartoHelperClass.getAllLayersInToc()
    let allObservableOFLayers:Array<Observable<any>> = []
    for (let index = 0; index < reponseLayers.length; index++) {
      const layerProp = reponseLayers[index];
      if (layerProp['type_layer'] == 'geosmCatalogue') {
        if (layerProp['properties']['type']=='couche') {
          if (this.StorageServiceService.getGroupThematiqueById(layerProp['properties']['group_id'])) {
            layerProp.badge={
              text:this.StorageServiceService.getGroupThematiqueById(layerProp['properties']['group_id']).nom,
              bgColor:this.StorageServiceService.getGroupThematiqueById(layerProp['properties']['group_id']).color
            }
          }
          layerProp['data'] = this.StorageServiceService.getCouche(layerProp['properties']['group_id'],layerProp['properties']['couche_id'])
        }else if (layerProp['properties']['type']=='carte'){

          if (this.StorageServiceService.getGroupcarteById(layerProp['properties']['group_id'])) {
            layerProp.badge={
              text:this.StorageServiceService.getGroupcarteById(layerProp['properties']['group_id']).nom,
              bgColor:this.StorageServiceService.getGroupcarteById(layerProp['properties']['group_id']).color
            }

          }
          layerProp['data'] = this.StorageServiceService.getCarte(layerProp['properties']['group_id'],layerProp['properties']['couche_id'])

        }
      }
      allObservableOFLayers.push(fromEvent( layerProp.layer,'change:visible').pipe(map((value) => value)) )
      allObservableOFLayers.push(fromEvent(layerProp.layer,'change:zIndex') .pipe(map((value) => value)))
      allObservableOFLayers.push(fromEvent(layerProp.layer,'change:opacity') .pipe(map((value) => value)))
    }

    function compare( a, b ) {
      if ( a.zIndex < b.zIndex ){
        return 1;
      }
      if ( a.zIndex > b.zIndex ){
        return -1;
      }
      return 0;
    }
    this.layersInToc = reponseLayers
    if (allObservableOFLayers.length > 0) {
      this.layerChange = undefined
      this.layerChange = observerMerge(
        ...allObservableOFLayers
      )
      this.layerChange.
      pipe(
        debounceTime(1000)
      )
      .subscribe((response)=>{
        this.layersInToc.sort( compare );
      })
    }
    this.layersInToc.sort( compare );

  }

  /**
   *drag and drop of layer finish
   @param event CdkDragDrop<string[]>
   */
  drop(event: CdkDragDrop<string[]>) {
    // console.log(event.previousIndex, event.currentIndex)
    let cartoHelperClass =  new cartoHelper()
    var layer = this.layersInToc[event.previousIndex]
    cartoHelperClass.editZindexOfLayer(layer.layer,this.layersInToc[event.currentIndex].zIndex)

    moveItemInArray(this.layersInToc, event.previousIndex, event.currentIndex);

    this.getAllLayersForTOC()
  }

  /**
   * Set opacity of a layer
   * @param event MatSliderChange
   * @param layer layersInMap
   */
  setOpactiyOfLayer(event:MatSliderChange,layer:layersInMap){
    layer.layer.setOpacity(event.value/100)
  }

  /**
   * Toogle visible of a layer
   * @param event MatCheckboxChange
   * @param layer layersInMap
   */
  setVisibleOfLayer(event:MatCheckboxChange,layer:layersInMap){
    layer.layer.setVisible(event.checked)
  }

  /**
   * Remove layer from map
   * @param layer layersInMap
   */
  removeLayer(layer:layersInMap){
    if (layer.type_layer == 'geosmCatalogue') {
      this.removeLayerCatalogue(layer)
    }else{
      let cartoHelperClass =  new cartoHelper()
      cartoHelperClass.removeLayerToMap(layer.layer)
    }
  }

  /**
   * Remove layer of type cataogue from map
   * @param layer layersInMap
   */
  removeLayerCatalogue(layer:layersInMap){
    let cartoHelperClass =  new cartoHelper()
    if (layer['properties']['type']=='carte') {
      var carte:carteInterface = this.StorageServiceService.getCarte(layer.properties['group_id'],layer.properties['couche_id'])
      if (carte) {
        carte.check = false
      }

    }else if (layer['properties']['type']=='couche'){
      var couche:coucheInterface = this.StorageServiceService.getCouche(layer.properties['group_id'],layer.properties['couche_id'])
      if (couche) {
        couche.check = false
      }
    }

    cartoHelperClass.removeLayerToMap(layer.layer)

  }

  /**
   * remove all layer of type layersInMap in map
   */
  clearMap(){
    let cartoHelperClass =  new cartoHelper()

    let reponseLayers:Array<layersInMap> = cartoHelperClass.getAllLayersInToc()
    for (let index = 0; index < reponseLayers.length; index++) {
      const layer = reponseLayers[index];
      this.removeLayer(layer)
    }

  }

/**
 * Share a layer
 * @param layer
 */
  shareLayer(layer:layersInMap){
    var params =this.ShareServiceService.shareLayer(layer.properties['type'],layer.properties['couche_id'],layer.properties['group_id'])
    console.log(params)
    var url_share = environment.url_frontend + '/map?'+ params
    this.manageCompHelper.openSocialShare(url_share,7)

  }

  /**
   * Share all layers in the toc
   */
  shareAllLayersInToc(){
    var pteToGetParams = []
    for (let index = 0; index < this.layersInToc.length; index++) {
      const layer = this.layersInToc[index];
      if (layer.tocCapabilities.share) {
        pteToGetParams.push({
          typeLayer:layer.properties['type'],
          id_layer:layer.properties['couche_id'],
          group_id:layer.properties['group_id']
        })
      }

    }
    var params = this.ShareServiceService.shareLayers(pteToGetParams)
    var url_share = environment.url_frontend + '/map?'+ params
    this.manageCompHelper.openSocialShare(url_share,7)
  }

  /**
   * Should we display the button tht open metadata modal ?
   * @param metadata Object
   */
  displayMetadataLink(metadata) {

    if (Array.isArray(metadata)) {
      return false
    } else {
      return true
    }
  }

  /**
   * open metadata
   * @param layer layersInMap
   */
  openMetadata(layer:layersInMap){
    var metadata
    var wms_type
    if (layer['properties']['type']=='carte') {
      var carte = this.StorageServiceService.getCarte(layer.properties['group_id'],layer.properties['couche_id'])
      metadata = carte.metadata
    }else if (layer['properties']['type']=='couche'){
      var couche = this.StorageServiceService.getCouche(layer.properties['group_id'],layer.properties['couche_id'])
      metadata = couche.metadata
      wms_type = couche.wms_type
    }

    if (this.displayMetadataLink(metadata) || wms_type=="osm" ) {

      const MetaData = this.dialog.open(MetadataComponent, {
        minWidth: "350px",
        // height: '80%',
        data: { exist:true,metadata: metadata, nom: carte?carte.nom:couche.nom, url_prefix: environment.url_prefix,data:carte?carte:couche}
      });

      MetaData.afterClosed().subscribe(result => {
        console.log('The dialog was closed :', result);
      });
    }else{
      const MetaData = this.dialog.open(MetadataComponent, {
        minWidth: "350px",
        data: { exist:false,metadata: metadata, nom: carte?carte.nom:couche.nom, url_prefix: environment.url_prefix,data:carte?carte:couche}
      });
    }

  }

}
