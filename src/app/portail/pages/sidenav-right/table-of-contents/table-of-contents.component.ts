import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, fromEvent, merge as observerMerge, Subscriber, ReplaySubject } from 'rxjs';

import { CartoHelper, layersInMap } from '../../../../../helper/carto.helper'
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import {
  Map, Transform, unByKey
} from '../../../../ol-module';
import { ShareServiceService } from '../../../../services/share-service/share-service.service'
import { MatSliderChange } from '@angular/material/slider';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { map, catchError, debounceTime, tap, startWith, takeUntil } from 'rxjs/operators';
import { coucheInterface, carteInterface } from '../../../../type/type';
import { environment } from '../../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { MetadataLayerComponent } from '../../../../modal/metadata/metadata.component';
import { DataOsmLayersServiceService } from '../../../../services/data-som-layers-service/data-som-layers-service.service';
import BaseLayer from 'ol/layer/Base';
import BaseEvent from 'ol/events/Event';
import { ObjectEvent } from 'ol/Object';
import { fromOpenLayerEvent } from '../../../../shared/class/fromOpenLayerEvent';

@Component({
  selector: 'app-table-of-contents',
  templateUrl: './table-of-contents.component.html',
  styleUrls: ['./table-of-contents.component.scss']
})
/**
 * Composnent of table of contents for handle layers
 */
export class TableOfContentsComponent implements OnInit {

  @Input() map: Map

  layersInToc: Array<layersInMap> = []
  
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    public dialog: MatDialog,
    public ShareServiceService: ShareServiceService,
    public manageCompHelper: ManageCompHelper
  ) { }

  ngOnInit(): void {}

  ngOnDestroy(){
    this.destroyed$.next()
    this.destroyed$.complete()
  }

  ngOnChanges(changes:SimpleChanges){
    if (changes.map.currentValue) {
      if (this.map) {
        fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(),'propertychange').pipe(
          tap(()=>{this.getAllLayersForTOC()}),
          takeUntil(this.destroyed$)
        ).subscribe()
       
      }
    }
  }

  /**
   * Construct the array this.layersInToc array.
   */
  getAllLayersForTOC() {

    let allObservableOFLayers: Array<Observable<BaseEvent>> = []
    
    this.layersInToc = new CartoHelper(this.map).getAllLayersInToc().
    filter((layerProp)=>layerProp.type_layer =='geosmCatalogue' )
    .filter((layerProp, index, self)=>{
      /**
       * unique layer ^^
       */
      return self.map((item)=>item.properties['couche_id']+item.properties['type']).indexOf(layerProp.properties['couche_id']+layerProp.properties['type']) === index;
   
    })
    .map((layerProp)=>{
      if (layerProp.properties['type']=='couche') {
        let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(layerProp.properties['couche_id'])

        layerProp.badge = {
          text: groupLayer.group.name,
          bgColor: groupLayer.group.color
        }
        layerProp.data = groupLayer
      } else if (layerProp.properties['type']=='carte')  {
        let baseMap = this.dataOsmLayersServiceService.getBasemap(layerProp.properties['couche_id'])
        layerProp.badge = {
          text: baseMap.name,
          bgColor: baseMap.pictogramme.color
        }
        layerProp.data = baseMap
      }
    
      allObservableOFLayers.push(fromOpenLayerEvent<BaseEvent>(layerProp.layer, 'change:visible').pipe(map((value) => value)))
      allObservableOFLayers.push(fromOpenLayerEvent<BaseEvent>(layerProp.layer, 'change:zIndex').pipe(map((value) => value)))
      allObservableOFLayers.push(fromOpenLayerEvent<BaseEvent>(layerProp.layer, 'change:opacity').pipe(map((value) => value)))

      return layerProp
    })

    function compare(a, b) {
      if (a.zIndex < b.zIndex) {
        return 1;
      }
      if (a.zIndex > b.zIndex) {
        return -1;
      }
      return 0;
    }

    if (allObservableOFLayers.length > 0) {
      observerMerge(
        ...allObservableOFLayers
      ).
        pipe(
          startWith(undefined),
          tap(()=>{
            this.layersInToc.sort(compare);
          }),
          takeUntil(this.destroyed$)
        )
        .subscribe()
    }

  }

  /**
   *drag and drop of layer finish
   @param event CdkDragDrop<string[]>
   */
  drop(event: CdkDragDrop<string[]>) {
    let cartoHelperClass = new CartoHelper(this.map)
    var layer = this.layersInToc[event.previousIndex]
    cartoHelperClass.editZindexOfLayer(layer.layer, this.layersInToc[event.currentIndex].zIndex)

    moveItemInArray(this.layersInToc, event.previousIndex, event.currentIndex);

    this.getAllLayersForTOC()
  }

  /**
   * Set opacity of a layer
   * @param event MatSliderChange
   * @param layer layersInMap
   */
  setOpactiyOfLayer(event: MatSliderChange, layer: layersInMap) {
    layer.layer.setOpacity(event.value / 100)
  }

  /**
   * Toogle visible of a layer
   * @param event MatCheckboxChange
   * @param layer layersInMap
   */
  setVisibleOfLayer(event: MatCheckboxChange, layer: layersInMap) {
    layer.layer.setVisible(event.checked)
  }

  
  /**
   * Remove layer of type cataogue from map
   * @param layer layersInMap
   */
   removeLayer(layer: layersInMap) {
    if (layer['properties']['type'] == 'carte') {
      this.dataOsmLayersServiceService.removeBaseMap(layer['properties']['couche_id'], this.map)
    } else if (layer['properties']['type'] == 'couche') {
      console.log(layer)
      this.dataOsmLayersServiceService.removeLayer(layer['properties']['couche_id'], this.map)
    }else{
      new CartoHelper(this.map).removeLayerToMap(layer.layer)
    }

  }

  /**
   * remove all layer of type layersInMap in map
   */
  clearMap() {
    new CartoHelper(this.map).getAllLayersInToc().map((layerProp)=>{ this.removeLayer(layerProp) })
  }

  /**
   * Share a layer
   * @param layer
   */
  shareLayer(layer: layersInMap) {
    let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(layer.properties['couche_id'])
    var params = this.ShareServiceService.shareLayer(layer.properties['couche_id'], groupLayer.group.group_id)
    var url_share = environment.url_frontend + '/map?' + params
    this.manageCompHelper.openSocialShare(url_share, 7)

  }

  /**
   * Share all layers in the toc
   */
  shareAllLayersInToc() {
    let pteToGetParams =  this.layersInToc.filter((item)=>item.tocCapabilities.share).map((item)=>{
        let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(item.properties['couche_id'])
      return {
        id_layer:parseInt(item.properties['couche_id']),
        group_id:groupLayer.group.group_id
      }
    })
    //Retrieve center's coordinates
    var center = this.map.getView().getCenter();
    var lonlat = Transform(center, 'EPSG:3857', 'EPSG:4326');
    var lon = lonlat[0];
    var lat = lonlat[1];
    var zoom = this.map.getView().getZoom()

    var coordinateSharedLink = 'pos=' + lon.toFixed(4) + ',' + lat.toFixed(4) + ',' + Math.floor(zoom)

    var params = this.ShareServiceService.shareLayers(pteToGetParams)

    var url_share = environment.url_frontend + '/map?' + params + '&' + coordinateSharedLink

    this.manageCompHelper.openSocialShare(url_share, 7)
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
  openMetadata(layer: layersInMap) {
    var metadata
    var wms_type
  //   if (layer['properties']['type'] == 'carte') {
  //     var carte = this.StorageServiceService.getCarte(layer.properties['group_id'], layer.properties['couche_id'])
  //     metadata = carte.metadata
  //   } else if (layer['properties']['type'] == 'couche') {
  //     var couche = this.StorageServiceService.getCouche(layer.properties['group_id'], layer.properties['couche_id'])
  //     metadata = couche.metadata
  //     wms_type = couche.wms_type
  //   }

  //   if (this.displayMetadataLink(metadata) || wms_type == "osm") {

  //     const MetaData = this.dialog.open(MetadataLayerComponent, {
  //       minWidth: "350px",
  //       // height: '80%',
  //       data: { exist: true, metadata: metadata, nom: carte ? carte.nom : couche.nom, url_prefix: environment.url_prefix, data: carte ? carte : couche }
  //     });

  //     MetaData.afterClosed().subscribe(result => {
  //     });
  //   } else {
  //     const MetaData = this.dialog.open(MetadataLayerComponent, {
  //       minWidth: "350px",
  //       data: { exist: false, metadata: metadata, nom: carte ? carte.nom : couche.nom, url_prefix: environment.url_prefix, data: carte ? carte : couche }
  //     });
  //   }

  }

}