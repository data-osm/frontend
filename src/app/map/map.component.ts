import { Component, OnInit, ViewChild, AfterViewInit, ViewChildren, NgZone, QueryList } from '@angular/core';
import { MatSidenavContainer, MatDrawer } from '@angular/material/sidenav';
import { rightMenuInterface } from '../type/type'
import { Router, ActivatedRoute, Params } from '@angular/router';
import {
  Map,
  View,
  Attribution,
  LayerGroup,
  Feature,
  Transform
} from '../ol-module';
import { StorageServiceService } from '../services/storage-service/storage-service.service'
import { ShareServiceService } from '../services/share-service/share-service.service'
import { TranslateService } from '@ngx-translate/core';
import { SidenaveLeftSecondaireComponent } from '../portail/pages/sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component';
import * as $ from 'jquery'
import { layersInMap, dataFromClickOnMapInterface } from '../../helper/carto.helper';
import { ManageCompHelper } from '../../helper/manage-comp.helper'
import { ContextMenuComponent } from '../portail/pages/context-menu/context-menu.component'



export const map = new Map({
  layers: [
    new LayerGroup({
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 4
  }),
  // controls: defaultControls({ attribution: false, zoom: false }).extend([attribution]),
  // controls: defaultControls({ attribution: true, zoom: false }),
});

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  /**
   * Context menu component of the app
   */
  @ViewChild(ContextMenuComponent, { static: true }) ContextMenuComp: ContextMenuComponent;

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
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data' },
    { name: 'edition', active: false, enable: false, tooltip: 'toolpit_tools', title: 'tools' },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing' },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend' },
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
    public manageCompHelper: ManageCompHelper
  ) {

  }

  ngAfterViewInit() {
    /**
     * set componwnt to the helper
     */
    // this.manageCompHelper.setComponent('SidenaveLeftSecondaireComp', this.SidenaveLeftSecondaireComp)
  }

  ngOnInit(): void {
    this.StorageServiceService.loadProjectData().then(
      (response) => {
        $('.loading-apps').hide()
      },
      (error) => {

      }
    )

    map.setTarget('map1')
    map.setTarget('map')
    map.updateSize()


    // this.StorageServiceService.states.subscribe((value) => {
    //   if (value.loadProjectData) {
    //     this.handleMapParamsUrl()
    //     this.mapClicked()
    //     map.updateSize()
    //     map.getView().fit(this.StorageServiceService.getConfigProjet().bbox, { 'size': map.getSize(), 'duration': 1000 });
    //     var drawers: QueryList<MatDrawer> = this.sidenavContainer._drawers
    //     drawers.forEach((drawer) => {
    //       drawer.openedChange.subscribe(() => {
    //         map.updateSize()
    //       })
    //     })
    //   }
    // })

    /**
     * use for the count of layers in the TOC
     * the red badge on te button toogle the TOC
     */
    // map.getLayers().on('propertychange', (ObjectEvent) => {
    //   let cartoHelperClass = new cartoHelper()

    //   this.layersInToc = cartoHelperClass.getAllLayersInToc()

    //   /**
    //    * open right sidenav if there are 2 layers in the TOC
    //    */
    //   if (this.layersInToc.length == 2 && !this.getRightMenu('toc').active) {
    //     this.openRightMenu('toc')
    //   }

    // })

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
  // handleMapParamsUrl() {
  //   this.activatedRoute.queryParams.subscribe(params => {
  //     /** share of layers */
  //     if (params['layers']) {
  //       // verify if params pos is present in url param et zoomer dessus
  //       var layers = params['layers'].split(';')
  //       this.ShareServiceService.addLayersFromUrl(layers)

  //     }
  //     if (params['feature']) {
  //       var parametersShared = params['feature'].split(';')
  //       this.ShareServiceService.displayFeatureShared(parametersShared)
  //     }

  //     if(params['pos']){
  //       var positionData = params['pos'].split(',')
  //       this.ShareServiceService.zoomToSharePos(parseFloat(positionData[0]), parseFloat(positionData[1]), parseFloat(positionData[2]))
  //     }
  //   })
  // }


  /**
 * Initialise and handle click event on map
 * This is to handle oncly descriptive sheet
 */

  mapClicked() {
    map.on('click', (evt) => {

      function compare(a, b) {
        if (a.getZIndex() < b.getZIndex()) {
          return 1;
        }
        if (a.getZIndex() > b.getZIndex()) {
          return -1;
        }
        return 0;
      }

      // this._ngZone.run(() => {

      //   cartoHelperClass.mapHasCliked(evt, (data: dataFromClickOnMapInterface) => {
      //     if (data.type == 'raster') {

      //       var layers = data.data.layers.sort(compare);
      //       var layerTopZindex = layers.length > 0 ? layers[0] : undefined

      //       if (layerTopZindex) {
      //         var descriptionSheetCapabilities = layerTopZindex.get('descriptionSheetCapabilities')
      //       }

      //       // this.featureInfoWmsClick(data) descriptionSheetCapabilities
      //     } else if (data.type == 'clear') {

      //     } else if (data.type == 'vector') {
      //       var layers = data.data.layers.sort(compare);
      //       var layerTopZindex = layers.length > 0 ? layers[0] : undefined

      //       if (layerTopZindex) {
      //         var descriptionSheetCapabilities = layerTopZindex.get('descriptionSheetCapabilities')
      //       }
      //     }
      //   })

      // })
    })
  }

  /**
   * Toggle geolocation
   * if the geolocation layer exist, the user is already located, if not we must geolocate him
   */


}
