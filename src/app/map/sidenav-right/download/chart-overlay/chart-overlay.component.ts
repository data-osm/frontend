import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Chart } from "chart.js";

@Component({
  selector: 'app-chart-overlay',
  templateUrl: './chart-overlay.component.html',
  styleUrls: ['./chart-overlay.component.scss']
})
export class ChartOverlayComponent implements OnInit {

  /** configuration of th chart */
  @Input() chartConnfiguration:any
  /**
   * id of the chart
   */
  @Input() idChart:any

  /**
   * Close chart
   */
  @Output() close = new EventEmitter<any>()

  myChart

  constructor() { }

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    console.log(this.idChart,this.chartConnfiguration,'ChartOverlayComponent')
    if(this.idChart && this.chartConnfiguration){
        this.initialiseChart()
    }
  }

  /**
   * Initialise th chart
   */
  initialiseChart(){
    new Chart(this.idChart,this.chartConnfiguration)
  }

  closeChart(){
    console.log(this.close)
    this.close.emit(this.idChart)
  }

}
