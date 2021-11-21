import { Component, Input, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FeatureToDownload } from '../../../data/models/download';
import { Layer } from '../../../type/type';

@Component({
  selector: 'app-card-download-layer',
  templateUrl: './card-download-layer.component.html',
  styleUrls: ['./card-download-layer.component.scss']
})
export class CardDownloadLayerComponent implements OnInit {

  @Input()layer:Layer 
  @Input()provider_vector_id:number
  @Input() table_id:number
  @Input() layer_name:string

  environment=environment

  constructor() { }

  ngOnInit(): void {
  }

}
