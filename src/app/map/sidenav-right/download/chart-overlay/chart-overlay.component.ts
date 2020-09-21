import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Chart } from "chart.js";
import * as $ from 'jquery'

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

  /**
   * list all files to download
   */
  @Output() listFiles= new EventEmitter<any>()

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
    this.myChart = new Chart(this.idChart,this.chartConnfiguration)
    setTimeout(() => {
      document.getElementById("chart-export-download-img")['href'] = this.myChart.toBase64Image()
    }, 1500);
  }

  closeChart(){
    this.close.emit(this.idChart)
  }

  listFilesToDownload(){
    this.listFiles.emit(this.idChart)
  }


}
