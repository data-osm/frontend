import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Chart } from "chart.js";
import * as $ from 'jquery'
import { CountFeature } from '../../../../../data/models/download';

@Component({
  selector: 'app-chart-overlay',
  templateUrl: './chart-overlay.component.html',
  styleUrls: ['./chart-overlay.component.scss']
})
export class ChartOverlayComponent implements OnInit {

  /** configuration of th chart */
  @Input() chartConnfiguration:any
 

  @Input()countFeatures:CountFeature[]
  /**
   * Close chart
   */
  @Input() close:()=>void

  @ViewChild('canvasChart') canvasChart: ElementRef<HTMLElement>;


  constructor() { }

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    if(this.chartConnfiguration){
        this.initialiseChart()
    }
  }

  /**
   * Initialise th chart
   */
  initialiseChart(){
    let myChart = new Chart(this.canvasChart.nativeElement,this.chartConnfiguration)
    setTimeout(() => {
      document.getElementById("chart-export-download-img")['href'] = myChart.toBase64Image()
    }, 1500);
  }

  closeChart(){
    this.close()
  }

  listFilesToDownload(){
    // this.listFiles.emit(this.idChart)
  }


}
