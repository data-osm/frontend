import { Component, OnInit, ViewChild, AfterViewInit, ViewChildren, NgZone, QueryList } from '@angular/core';
import { MatSidenavContainer, MatDrawer } from '@angular/material/sidenav';
import { rightMenuInterface } from '../type/type'
import { Router, ActivatedRoute, Params } from '@angular/router';
import {
  Map,
  View,
  TileLayer,
  XYZ,
  defaultControls,
  Attribution,
  LayerGroup
} from '../ol-module';
import { StorageServiceService } from '../services/storage-service/storage-service.service'
import { ShareServiceService } from 'src/app/services/share-service/share-service.service'
import { TranslateService } from '@ngx-translate/core';
import { SidenaveLeftSecondaireComponent } from './sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component';
import * as $ from 'jquery'
import { layersInMap, cartoHelper, dataFromClickOnMapInterface } from 'src/helper/carto.helper';
import {manageCompHelper} from 'src/helper/manage-comp.helper'

var attribution = new Attribution({
  collapsible: false
});

export const map = new Map({
  layers: [
    new LayerGroup({
      nom: 'group-layer-shadow',
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 4
  }),
  controls: defaultControls({ attribution: false, zoom: false }).extend([attribution]),
});

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  /**
   * La sidenav
   */
  @ViewChild(MatSidenavContainer, { static: true }) sidenavContainer: MatSidenavContainer;

  /**
   * Second component of the left sidenav On top of the first one:
   * It is use to show details of a group thematique or a group carte
   */
  @ViewChild(SidenaveLeftSecondaireComponent, { static: true }) SidenaveLeftSecondaireComp: SidenaveLeftSecondaireComponent

  /**
   * All menu of the rith sidenav
   */
  ritghtMenus: Array<rightMenuInterface> = [
    { name: 'toc', active: false, enable: true, tooltip: 'toolpit_toc', title: 'table_of_contents' },
    { name: 'edition', active: false, enable: true, tooltip: 'toolpit_tools', title: 'tools' },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing' },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend' },
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data' }
  ]

  /**
   * all the layer in the toc
   */
  layersInToc: Array<layersInMap> = []

  constructor(
    public StorageServiceService: StorageServiceService,
    public translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    public ShareServiceService: ShareServiceService,
    private _ngZone: NgZone,
    public manageCompHelper:manageCompHelper
  ) {

  }

  ngOnInit(): void {
    map.setTarget('map1')
    map.setTarget('map')
    map.updateSize()


    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        map.getView().fit(this.StorageServiceService.getConfigProjet().bbox, { 'size': map.getSize(), 'duration': 1000 });
        this.handleMapParamsUrl()
        this.mapClicked()
        map.updateSize()
        var drawers:QueryList<MatDrawer> = this.sidenavContainer._drawers
        drawers.forEach((drawer)=>{
          drawer.openedChange.subscribe(()=>{
            console.log('close open')
            map.updateSize()
          })
        })
      }
    })

    /**
     * use for the count of layers in the TOC
     * the red badge on te button toogle the TOC
     */
    map.getLayers().on('propertychange', (ObjectEvent) => {
      let cartoHelperClass = new cartoHelper()

      this.layersInToc = cartoHelperClass.getAllLayersInToc()
    })

  }

  /**
   * Get a menu from right menu
   * @param name string name of the menu
   * @return rightMenuInterface|undefined
   */
  getRightMenu(name: string): rightMenuInterface | undefined {
    for (let index = 0; index < this.ritghtMenus.length; index++) {
      const element = this.ritghtMenus[index];
      if (element.name == name) {
        return element
      }
    }
    return undefined
  }

  /**
   * Open right menu
   * @param name string
   */
  openRightMenu(name: string) {

    var menu = this.getRightMenu(name)

    if (menu.active) {

      this.sidenavContainer.end.close()
      for (let index = 0; index < this.ritghtMenus.length; index++) {
        const element = this.ritghtMenus[index];
        element.active = false
      }

    } else {
      this.sidenavContainer.end.open()
      for (let index = 0; index < this.ritghtMenus.length; index++) {
        const element = this.ritghtMenus[index];
        element.active = false
      }
      menu.active = true
    }

  }

  /**
   * Get the active right menu
   * @return rightMenuInterface
   */
  getRightMenuActive(): rightMenuInterface {
    for (let index = 0; index < this.ritghtMenus.length; index++) {
      if (this.ritghtMenus[index].active) {
        return this.ritghtMenus[index]
      }
    }
    return null
  }

  /**
   * get the constant map
   * @return Map
   */
  getMap(): Map {
    return map
  }

  /**
   * Handle parameters of the app when opening with route /map
   */
  handleMapParamsUrl() {
    this.activatedRoute.queryParams.subscribe(params => {
      console.log(params)
      /** share of layers */
      if (params['layers']) {
        var layers = params['layers'].split(';')
        this.ShareServiceService.addLayersFromUrl(layers)
      }
      if(params['feature']){
        var parametersShared =  params['feature'].split(';')
        this.ShareServiceService.displayFeatureShared(parametersShared)
      }
    })
  }


  /**
 * Initialise and handle click event on map
 * This is to handle oncly descriptive sheet
 */

  mapClicked() {
    map.on('click', (evt) => {

      function compare( a, b ) {
        if ( a.getZIndex() < b.getZIndex() ){
          return 1;
        }
        if ( a.getZIndex() > b.getZIndex() ){
          return -1;
        }
        return 0;
      }

      this._ngZone.run(() => {
        let cartoHelperClass = new cartoHelper()

        cartoHelperClass.mapHasCliked(evt, (data: dataFromClickOnMapInterface) => {
          if (data.type == 'raster') {

            var layers = data.data.layers.sort( compare );
            var layerTopZindex = layers.length>0?layers[0]:undefined

            if (layerTopZindex) {
              var descriptionSheetCapabilities = layerTopZindex.get('descriptionSheetCapabilities')
              this.manageCompHelper.openDescriptiveSheet(descriptionSheetCapabilities,cartoHelperClass.constructAlyerInMap(layerTopZindex),data.data.coord)
            }

            // this.featureInfoWmsClick(data) descriptionSheetCapabilities
          } else if (data.type == 'clear') {

          } else if (data.type == 'vector') {
            var layers = data.data.layers.sort( compare );
            var layerTopZindex = layers.length>0?layers[0]:undefined

            if (layerTopZindex) {
              var descriptionSheetCapabilities = layerTopZindex.get('descriptionSheetCapabilities')
              this.manageCompHelper.openDescriptiveSheet(descriptionSheetCapabilities,cartoHelperClass.constructAlyerInMap(layerTopZindex),data.data.coord,data.data.feature.getGeometry(),data.data.feature.getProperties())
            }
          }
        })

      })
    })
  }

}
