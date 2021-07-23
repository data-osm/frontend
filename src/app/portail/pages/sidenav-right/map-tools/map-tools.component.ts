import { Component, OnInit, Input, ViewChild } from '@angular/core';
import {
  Map
} from '../../../../ol-module';
import {MeasureComponent} from './measure/measure.component'
import {DrawComponent} from './draw/draw.component'
/**
 * Componenent of all map edition tools : measure, draw, altimetry, print
 */
@Component({
  selector: 'app-map-tools',
  templateUrl: './map-tools.component.html',
  styleUrls: ['./map-tools.component.scss']
})
export class MapToolsComponent implements OnInit {

  @Input()map:Map

  /**
   * Draw feature componenet
   */
  @ViewChild(DrawComponent) drawComp:DrawComponent
  /**
   * measure feature componenet
   */

  @ViewChild(MeasureComponent) measureComp:MeasureComponent
  constructor() { }

  ngOnInit(): void {
  }

  /**
   * Fired when a panel is closed
   * We use this event to remove interaction of measure or draw features when thier panel is closed by the user
   * @param type string name of the closed panel
   */
  expansionClose(type:string){
    if (type =='measure') {
      this.measureComp.removeMeasureToApps()
    }else if (type == 'draw') {
      this.drawComp.desactivateAllAddTool()
      this.drawComp.desactivateAllModificationTool()
    }
  }

}
