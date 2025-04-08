import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, fromEvent, merge as observerMerge, Subscriber, ReplaySubject, merge } from 'rxjs';

import { CartoHelper } from '../../../../../helper/carto.helper'
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import {
  LayerGroup,
  Transform, unByKey
} from '../../../../ol-module';
import { DataToShareLayer, ShareServiceService, VIEW_QUERY_PARAM } from '../../../../services/share-service/share-service.service'
import { MatLegacySliderChange as MatSliderChange } from '@angular/material/legacy-slider';
import { MatLegacyCheckboxChange as MatCheckboxChange } from '@angular/material/legacy-checkbox';
import { map, catchError, debounceTime, tap, startWith, takeUntil } from 'rxjs/operators';
import { coucheInterface, carteInterface } from '../../../../type/type';
import { environment } from '../../../../../environments/environment';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MetadataLayerComponent } from '../../../../modal/metadata/metadata.component';
import { DataOsmLayersServiceService } from '../../../../services/data-som-layers-service/data-som-layers-service.service';
import BaseLayer from 'ol/layer/Base';
import BaseEvent from 'ol/events/Event';
import { ObjectEvent } from 'ol/Object';
import { fromOpenLayerEvent } from '../../../../shared/class/fromOpenLayerEvent';

import { fromLayerGiroEvent, fromMapGiroEvent } from '../../../../shared/class/fromGiroEvent';

import {
  Map,
  Layer,
  ColorLayer,
  OrbitControls,
  Instance
} from "../../../../giro-3d-module"
import { Group, Mesh } from 'three';
import { MatomoTracker } from 'ngx-matomo-client';
import { LayersInMap } from '../../../../../helper/type';

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

  layersInToc: Array<LayersInMap> = []

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    private dataOsmLayersServiceService: DataOsmLayersServiceService,
    public dialog: MatDialog,
    public ShareServiceService: ShareServiceService,
    public manageCompHelper: ManageCompHelper,
    private readonly tracker: MatomoTracker
  ) { }

  ngOnInit(): void { }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.map.currentValue) {
      if (this.map) {
        // this.map.addEventListener("")

        merge(
          fromMapGiroEvent<"layer-order-changed">(this.map, "layer-order-changed"),
        ).pipe(
          debounceTime(500),
          tap(() => { this.getAllLayersForTOC() }),
          takeUntil(this.destroyed$)
        ).subscribe()

      }
    }
  }

  /**
   * Construct the array this.layersInToc array.
   */
  getAllLayersForTOC() {
    let allObservableOFLayers: Array<Observable<any>> = []
    this.layersInToc = new CartoHelper(this.map).getAllLayersInToc().
      filter((layerProp) => layerProp.type_layer == 'geosmCatalogue')
      .filter((layerProp, index, self) => {
        /**
         * unique layer ^^
         */
        return self.map((item) => item.properties.couche_id + item.properties['type']).indexOf(layerProp.properties.couche_id + layerProp.properties['type']) === index;

      })
      .map((layerProp) => {

        if (layerProp.properties['type'] == 'couche') {
          let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(layerProp.properties.couche_id)

          layerProp.badge = {
            text: groupLayer.group.name,
            bgColor: groupLayer.group.color
          }
          layerProp.data = groupLayer
        } else if (layerProp.properties['type'] == 'carte') {
          let baseMap = this.dataOsmLayersServiceService.getBasemap(layerProp.properties.couche_id)
          layerProp.badge = {
            text: baseMap.name,
            bgColor: baseMap.pictogramme.color
          }
          layerProp.data = baseMap
        }
        // layerProp.layer.map((ll) => {
        //   // allObservableOFLayers.push(fromLayerGiroEvent<"visible-property-changed">(ll, "visible-property-changed").pipe(map((value) => value)))
        // })

        // let threeLayers = this.map["_instance"]
        //   .getObjects(
        //     (obj) =>
        //       obj instanceof Group && obj.userData.isLayer && obj.userData.name == layerProp.nom
        //   ) as Array<Group>


        // layerProp.visible = layerProp.layer[0].visible || threeLayers.find((obj) => obj.visible) != undefined


        return layerProp
      }).sort(compare.bind(this))



    function compare(a: LayersInMap, b: LayersInMap) {
      if (this.map.getIndex(a.layer[0]) < this.map.getIndex(b.layer[0])) {
        return 1;
      }
      if (this.map.getIndex(a.layer[0]) > this.map.getIndex(b.layer[0])) {
        return -1;
      }
      return 0;
    }



  }

  /**
   *drag and drop of layer finish
   @param event CdkDragDrop<string[]>
   */
  drop(event: CdkDragDrop<string[]>) {
    let cartoHelperClass = new CartoHelper(this.map)
    var layer = this.layersInToc[event.previousIndex]
    let delta_index = event.previousIndex - event.currentIndex
    if (delta_index < 0) {
      while (delta_index < 0) {
        this.map.moveLayerDown(layer.layer[0] as any)
        delta_index = delta_index + 1
      }
    }
    else if (delta_index > 0) {
      while (delta_index > 0) {
        this.map.moveLayerUp(layer.layer[0] as any)
        delta_index = delta_index - 1
      }
    }
    // layer.layer.map((ll) => cartoHelperClass.s(ll, this.layersInToc[event.currentIndex].zIndex))

    moveItemInArray(this.layersInToc, event.previousIndex, event.currentIndex);

    this.getAllLayersForTOC()
  }

  /**
   * Set opacity of a layer
   * @param event MatSliderChange
   * @param layer LayersInMap
   */
  setOpactiyOfLayer(event: MatSliderChange, layer: LayersInMap) {

    (layer.layer as Array<any>).filter((layer) => layer instanceof ColorLayer == true).map((lay: ColorLayer) => lay.opacity = event.value / 100)
    this.map["_instance"].notifyChange(this.map)
  }

  /**
   * Toogle visible of a layer
   * @param event MatCheckboxChange
   * @param layer LayersInMap
   */
  setVisibleOfLayer(event: MatCheckboxChange, layer: LayersInMap) {
    const instance: Instance = this.map["_instance"]
    instance.scene
      .traverse(
        (obj) => {
          if (obj instanceof Group && obj.userData.isLayer && obj.userData.name == layer.nom) {
            obj.visible = event.checked
          }
        }
      )
    // .map((obj: Mesh) => {
    //   obj.visible = event.checked
    //   return obj
    // })
    layer.layer.map((lay) => {
      lay.visible = event.checked
    })
    layer.visible = event.checked

    this.map["_instance"].notifyChange(this.map)

  }


  /**
   * Remove layer of type cataogue from map
   * @param layer layersInMap
   */
  removeLayer(layer: LayersInMap) {
    if (layer['properties']['type'] == 'carte') {
      this.dataOsmLayersServiceService.removeBaseMap(layer['properties']['couche_id'], this.map)
    } else if (layer['properties']['type'] == 'couche') {
      console.log(layer)
      this.dataOsmLayersServiceService.removeLayer(layer['properties']['couche_id'], this.map)
    } else {
      layer.layer.map((lay) => new CartoHelper(this.map).removeLayerToMap(lay))

    }

  }

  /**
   * remove all layer of type layersInMap in map
   */
  clearMap() {
    new CartoHelper(this.map).getAllLayersInToc().filter((layerProp) => layerProp.tocCapabilities.removable).map((layerProp) => { this.removeLayer(layerProp) })
  }

  /**
   * Share a layer
   * @param layer
   */
  shareLayer(layer: LayersInMap) {

    const pov = CartoHelper.getCurrentPointOfView(this.map)

    var coordinateSharedLink = VIEW_QUERY_PARAM + '=' + pov

    if (layer.properties.type == 'couche') {
      let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(layer.properties.couche_id)
      var params = this.ShareServiceService.shareLayer({ id_layer: layer.properties.couche_id, group_id: groupLayer.group.group_id, type: 'layer' })
      var url_share = environment.url_frontend + '/map?' + params + '&' + coordinateSharedLink
      this.tracker.trackEvent("Share", "layer", layer.nom, layer.properties.couche_id)
      this.manageCompHelper.openSocialShare(url_share, 7)
    } else {
      var params = this.ShareServiceService.shareLayer({ id_layer: layer.properties.couche_id, group_id: null, type: 'map' })
      var url_share = environment.url_frontend + '/map?' + params + '&' + coordinateSharedLink
      this.manageCompHelper.openSocialShare(url_share, 7)

    }


  }

  /**
   * Share all layers in the toc
   */
  shareAllLayersInToc() {
    let pteLayerToGetParams: Array<DataToShareLayer> = this.layersInToc
      .filter((item) => item.tocCapabilities.share)
      .map((item) => {
        if (item.properties['type'] == 'couche') {
          let groupLayer = this.dataOsmLayersServiceService.getLayerInMap(item.properties.couche_id)
          return {
            id_layer: item.properties.couche_id,
            group_id: groupLayer.group.group_id,
            type: 'layer'
          }
        } else if (item.properties['type'] == 'carte') {
          return {
            id_layer: item.properties.couche_id,
            group_id: null,
            type: 'map'
          }
        }

      })


    const pov = CartoHelper.getCurrentPointOfView(this.map)

    var coordinateSharedLink = VIEW_QUERY_PARAM + '=' + pov

    var params = this.ShareServiceService.shareLayers(pteLayerToGetParams)

    var url_share = environment.url_frontend + '/map?' + params + '&' + coordinateSharedLink

    this.tracker.trackEvent("Share", "all")

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
  openMetadata(layer: LayersInMap) {
    let data = this.dataOsmLayersServiceService.getLayerInMap(layer.properties.couche_id)
    this.dialog.open(MetadataLayerComponent, { data: data.layer })

  }

}