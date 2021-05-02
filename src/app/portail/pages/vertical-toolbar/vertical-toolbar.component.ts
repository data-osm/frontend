import { Component, OnInit, Input } from '@angular/core';
import {
  Map, Zoom, Point,
} from '../../../ol-module';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { SidenaveLeftSecondaireComponent } from '../sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component'
import { map } from '../../../map/map.component';
import { StorageServiceService } from '../../../services/storage-service/storage-service.service';
import { environment } from '../../../../environments/environment';
import { CartoHelper } from '../../../../helper/carto.helper';
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
 * Secondary component of the left sidenav. On top of the first one:
 * It is use to show details of a group thematique or a group carte
 */
  @Input() SidenaveLeftSecondaireComp: SidenaveLeftSecondaireComponent

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
    public storageServiceService: StorageServiceService
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

    this.storageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.map.on('movestart', () => {
          if (!this.userMovedMap) {
            this.historyMapPosition = [{
              coordinates: [this.map.getView().getCenter()[0], this.map.getView().getCenter()[1]],
              zoom: this.map.getView().getZoom()
            }]
            this.indexHstoryMapPosition = 0
          }
        })

        this.map.on('moveend', () => {
          if (!this.userMovedMap) {
            this.historyMapPosition[1] = {
              coordinates: [this.map.getView().getCenter()[0], this.map.getView().getCenter()[1]],
              zoom: this.map.getView().getZoom()
            }
            this.indexHstoryMapPosition = 0
          }
        })
      }
    })

  }

 

  ngOnInit(): void {


  }

  /**
   * Get the color for the background of the div toogle sidenav left
   */
  getBackgroundColorOfTheToogleSlidenav(): string {
    return this.SidenaveLeftSecondaireComp.getBackgroundColor() ? this.SidenaveLeftSecondaireComp.getBackgroundColor() : '#fff'
  }

  /**
   * Get the color of the icon in  the div toogle sidenav left
   */
  getColorOfTheToogleSlidenav(): string {
    return this.SidenaveLeftSecondaireComp.getBackgroundColor() ? '#fff' : environment.primaryColor
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
    new CartoHelper(this.map).fit_view(this.storageServiceService.getExtentOfProject(true), 15)
  }

  /**
   * open Modal to zoom to a coordinates
   */
  zoomTo() {

  }

  /**
   * Roolback the state of map
   */
  rollBack() {
    if (this.historyMapPosition.length > 0 && this.indexHstoryMapPosition == 0 ) {
      this.userMovedMap = true
      this.indexHstoryMapPosition = 1
      console.log('back')
      new CartoHelper(this.map).fit_view(new Point(this.historyMapPosition[0 ].coordinates),this.historyMapPosition[0 ].zoom)
      setTimeout(() => {
      this.userMovedMap = false

      }, 2000);
    }

  }

  /**
   * rollFront the state of map
   */
  rollFront() {
    if (this.historyMapPosition.length > 0 &&  this.indexHstoryMapPosition == 1 ) {
      this.userMovedMap = true
      this.indexHstoryMapPosition = 0
      new CartoHelper(this.map).fit_view(new Point(this.historyMapPosition[1].coordinates), this.historyMapPosition[1 ].zoom)
      setTimeout(() => {
        this.userMovedMap = false

        }, 2000);
    }
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
