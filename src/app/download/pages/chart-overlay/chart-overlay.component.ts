import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Chart } from "chart.js";
import * as $ from 'jquery'
import { FeatureToDownload } from '../../../data/models/download';
import { AdminBoundaryRespone } from '../../../data/models/parameters';
import { ListDownloadLayersComponent } from '../list-download-layers/list-download-layers.component';

@Component({
  selector: 'app-chart-overlay',
  templateUrl: './chart-overlay.component.html',
  styleUrls: ['./chart-overlay.component.scss']
})
export class ChartOverlayComponent implements OnInit {

  /** configuration of th chart */
  @Input() chartConnfiguration:any
 
  @Input()admin_boundary_id:number
  @Input()table_id:number
  @Input()name:string
  @Input()countFeatures:FeatureToDownload[]
  /**
   * Close chart
   */
  @Input() close:()=>void

  @ViewChild('canvasChart') canvasChart: ElementRef<HTMLElement>;


  constructor(
    public dialog:MatDialog
  ) { }

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
    this.dialog.open(ListDownloadLayersComponent,{
      data:{
        admin_boundary_id:this.admin_boundary_id,
        table_id:this.table_id,
        name:this.name,
        countFeatures:this.countFeatures
      }
    })
  }


}
