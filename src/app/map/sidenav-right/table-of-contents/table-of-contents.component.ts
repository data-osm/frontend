import { Component, OnInit, Input } from '@angular/core';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

import {cartoHelper, layersInMap} from 'src/helper/carto.helper'
import {
  Map
} from '../../../ol-module';
import {StorageServiceService} from 'src/app/services/storage-service/storage-service.service'

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

  constructor(
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
    this.map.getLayers().on('propertychange',(ObjectEvent)=>{

      this.getAllLayersForTOC()
    })
  }

  /**
   * get all layers that have to go in toc
   */
  getAllLayersForTOC(){
    let cartoHelperClass =  new cartoHelper()

    let reponseLayers:Array<layersInMap> = cartoHelperClass.getAllLayersInToc()

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
    this.layersInToc.sort( compare );
    console.log(this.layersInToc)
  }

  /**
   *
   */
  drop(event: CdkDragDrop<string[]>) {
    // console.log(event.previousIndex, event.currentIndex)
    let cartoHelperClass =  new cartoHelper()
    var layer = this.layersInToc[event.previousIndex]
    cartoHelperClass.editZindexOfLayer(layer.layer,this.layersInToc[event.currentIndex].zIndex)

    moveItemInArray(this.layersInToc, event.previousIndex, event.currentIndex);

    this.getAllLayersForTOC()
  }

}
