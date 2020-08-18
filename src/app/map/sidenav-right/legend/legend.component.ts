import { Component, OnInit, Input } from '@angular/core';
import { layersInMap, cartoHelper } from 'src/helper/carto.helper';
import { Observable, fromEvent, merge as observerMerge } from 'rxjs';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service';
import { debounceTime,map } from 'rxjs/operators';
import { Map } from 'src/app/ol-module'
import {DomSanitizer} from '@angular/platform-browser';
import * as $ from 'jquery'
@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
/**
 * handle legend of layers in the TOC
 */
export class LegendComponent implements OnInit {

  @Input() map: Map

  layersInTocWithLegend: Array<layersInMap> = []


  constructor(
    public DomSanitizer:DomSanitizer,
    public StorageServiceService: StorageServiceService,
  ) { }

  ngOnInit(): void {
    this.map.getLayers().on('propertychange',(ObjectEvent)=>{
      this.getAllLayersForTOC()
    })
  }

  /**
   * Construct the array this.layersInToc array.
   */
  getAllLayersForTOC() {
    let cartoHelperClass = new cartoHelper()

    let reponseLayers: Array<layersInMap> = []
    for (let index = 0; index < cartoHelperClass.getAllLayersInToc().length; index++) {
      const layerProp = cartoHelperClass.getAllLayersInToc()[index];
      if (layerProp.legendCapabilities && layerProp['type_layer'] == 'geosmCatalogue' ) {
        if (layerProp.legendCapabilities.useCartoServer) {
          var url;
          var identifiant;
          if (layerProp['properties']['type']=='couche') {
            var couche  = this.StorageServiceService.getCouche(layerProp['properties']['group_id'],layerProp['properties']['couche_id'])
            url = couche?couche.url:undefined
            identifiant = couche?couche.identifiant:undefined
          }else if (layerProp['properties']['type']=='carte') {
            var carte  = this.StorageServiceService.getCarte(layerProp['properties']['group_id'],layerProp['properties']['couche_id'])
            url = carte?carte.url:undefined
            identifiant = couche?couche.identifiant:undefined

          }
          if (url && identifiant) {
            layerProp.legendCapabilities.urlImg = $.trim(url+"&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS="+identifiant+"&STYLE=default&SLD_VERSION=1.1.0&LAYERTITLE=false&RULELABEL=true")
            // console.log(layerProp.legendCapabilities.urlImg)
          }

        }

        if (layerProp.legendCapabilities.urlImg) {
          reponseLayers.push(layerProp)
        }
      }
    }

    function compare(a, b) {
      if (a.zIndex < b.zIndex) {
        return 1;
      }
      if (a.zIndex > b.zIndex) {
        return -1;
      }
      return 0;
    }
    this.layersInTocWithLegend = reponseLayers

    this.layersInTocWithLegend.sort(compare);

  }

}
