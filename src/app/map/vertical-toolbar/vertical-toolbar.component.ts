import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

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
  constructor() {
    this.environment = environment
  }

  ngOnInit(): void {
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
