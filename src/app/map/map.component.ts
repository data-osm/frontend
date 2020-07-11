import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import {MatSidenavContainer } from '@angular/material/sidenav';
import {rightMenuInterface} from '../type/type'

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
    {name:'toc',active:false,enable:true,tooltip:'toolpit_toc'},
    {name:'edition',active:false,enable:true,tooltip:'toolpit_tools'},
    {name:'routing',active:false,enable:true,tooltip:'toolpit_map_routing'},
    {name:'legend',active:false,enable:true,tooltip:'toolpit_legend'},
    {name:'download',active:false,enable:true,tooltip:'toolpit_download_data'}
  ]

  constructor() {

  }

  ngOnInit(): void {

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


}
