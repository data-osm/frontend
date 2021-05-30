import { Component, OnInit, Input } from '@angular/core';
import {
  Map, Zoom, Point,
} from '../../../ol-module';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { environment } from '../../../../environments/environment';
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
  @Input() map: Map

  /**
   * Sidenav container of the map component
   */
  @Input() sidenavContainer: MatSidenavContainer


  /**
   * user moved map ?
   */
  userMovedMap:boolean = false
  /**
   * index of historyMapPosition that represnet current position
   */
  indexHstoryMapPosition=0
  /**
   * History of positions of map when moved
   */
  historyMapPosition: Array<{ coordinates: [number, number], zoom: number }> = []


  constructor(
  ) {
    this.environment = environment
  }

  ngOnAfterViewInit(){
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


  }



  /**
   * Close/open left sidenav
   */
  toogleLeftSidenav() {
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
  zoom(type: 'plus' | 'minus') {

  }

  /**
   * Zoom to global view of the project
   */
  globalView() {
    // new CartoHelper(this.map).fit_view(this.storageServiceService.getExtentOfProject(true), 15)
  }

  /**
   * open Modal to zoom to a coordinates
   */
  zoomTo() {

  }



  /**
   * Toogle mappilary
   */
  toogleMappilary() {

  }

  /**
   * toogle compare maps
   */
  toogleCompare() {

  }

}
