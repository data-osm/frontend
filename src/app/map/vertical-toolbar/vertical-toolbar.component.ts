import { Component, OnInit, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  Map, Zoom,
  }from '../../ol-module';
import { MatSidenavContainer } from '@angular/material/sidenav';

/**
 * vertical toolbar that contains naviguation button
 */
@Component({
  selector: 'app-vertical-toolbar',
  templateUrl: './vertical-toolbar.component.html',
  styleUrls: ['./vertical-toolbar.component.scss']
})
export class VerticalToolbarComponent implements OnInit {

  environment

  /**
   * Map of the app
   */
  @Input()map:Map

  /**
   * Sidenav container of the map component
   */
  @Input()sidenavContainer:MatSidenavContainer

  constructor() {
    this.environment = environment
  }

  /**
   * Initialise map tools, zooms
   */
  initialiseMatTools(){
    var zooms = new Zoom({
      'target': 'zooms',
      'zoomInLabel': document.getElementById('zoom-plus'),
      'zoomOutLabel': document.getElementById('zoom-minus'),
      'zoomInTipLabel': '',
      'zoomOutTipLabel': ''
    })

    zooms.setMap(this.map)

  }

  ngOnInit(): void {
    this.initialiseMatTools()
  }

  /**
   * Close/open left sidenav
   */
  toogleLeftSidenav(){
    if (this.sidenavContainer.start.opened) {
      this.sidenavContainer.start.close()
    } else {
      this.sidenavContainer.start.open()
    }
  }

  /**
   * Zoom or de zoom
   * @param type 'plus'|'minus'
   */
  zoom(type:'plus'|'minus'){

  }

  /**
   * Zoom to global view of the project
   */
  globalView(){

  }

  /**
   * open Modal to zoom to a coordinates
   */
  zoomTo(){

  }

  /**
   * Roolback the state of map
   */
  rollBack(){

  }

  /**
   * rollFront the state of map
   */
  rollFront(){

  }

  /**
   * Toogle mappilary
   */
  toogleMappilary(){

  }

  /**
   * toogle compare maps
   */
  toogleCompare(){

  }

}
