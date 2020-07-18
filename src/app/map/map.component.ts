import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import {MatSidenavContainer } from '@angular/material/sidenav';
import {rightMenuInterface} from '../type/type'
import {
Map,
View,
TileLayer,
XYZ,
defaultControls,
Attribution
}from '../ol-module';
import {StorageServiceService} from '../services/storage-service/storage-service.service'
import {cartoHelper} from '../../helper/carto.helper'
import { TranslateService } from '@ngx-translate/core';


var attribution = new Attribution({
  collapsible: false
});

const map = new Map({
  layers: [
    new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      })
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 4
  }),
  controls: defaultControls({attribution: false,zoom:false}).extend([attribution]),
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
  @ViewChild(MatSidenavContainer, { static: true}) sidenavContainer: MatSidenavContainer;


  /**
   * All menu of the rith sidenav
   */
  ritghtMenus:Array<rightMenuInterface>=[
    {name:'toc',active:false,enable:true,tooltip:'toolpit_toc',title:'table_of_contents'},
    {name:'edition',active:false,enable:true,tooltip:'toolpit_tools',title:'tools'},
    {name:'routing',active:false,enable:true,tooltip:'toolpit_map_routing',title:'map_routing'},
    {name:'legend',active:false,enable:true,tooltip:'toolpit_legend',title:'legend'},
    {name:'download',active:false,enable:true,tooltip:'toolpit_download_data',title:'download_data'}
  ]
  constructor(
    public StorageServiceService:StorageServiceService,
    public translate: TranslateService,
  ) {

  }

  ngOnInit(): void {
    map.setTarget('map1')
    map.setTarget('map')

    this.StorageServiceService.states.subscribe((value)=>{
      if (value.loadProjectData) {
        this.addLayerShadow()
        map.getView().fit(this.StorageServiceService.getConfigProjet().bbox, { 'size': map.getSize(), 'duration': 1000 });
      }
    })
  }

  /**
   * Get a menu from right menu
   * @param name string name of the menu
   * @return rightMenuInterface|undefined
   */
  getRightMenu(name:string):rightMenuInterface|undefined{
    for (let index = 0; index < this.ritghtMenus.length; index++) {
      const element = this.ritghtMenus[index];
      if (element.name==name) {
        return element
      }
    }
    return undefined
  }

  /**
   * Open right menu
   * @param name string
   */
  openRightMenu(name:string){

    var menu = this.getRightMenu(name)

    if (menu.active) {

      this.sidenavContainer.end.close()
      for (let index = 0; index < this.ritghtMenus.length; index++) {
        const element = this.ritghtMenus[index];
        element.active=false
      }

    }else{
      this.sidenavContainer.end.open()
      for (let index = 0; index < this.ritghtMenus.length; index++) {
        const element = this.ritghtMenus[index];
        element.active=false
      }
      menu.active=true
    }

  }

  /**
   * Get the active right menu
   * @return rightMenuInterface
   */
  getRightMenuActive():rightMenuInterface{
    for (let index = 0; index < this.ritghtMenus.length; index++) {
      if (this.ritghtMenus[index].active) {
        return this.ritghtMenus[index]
      }
    }
    return null
  }

  /**
   * Add layer shadow in the map
   */
  addLayerShadow(){
    var cartoHelperClass = new cartoHelper(map)
    var layer  = cartoHelperClass.constructShadowLayer(this.StorageServiceService.getConfigProjet().roiGeojson)
    layer.setZIndex(1000)
    map.addLayer(layer)
  }

  /**
   * get the constant map
   * @return Map
   */
  getMap():Map{
    return map
  }



}
