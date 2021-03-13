import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
import { BaseMap } from '../../../../../data/models/base-maps';

@Component({
  selector: 'app-base-map',
  templateUrl: './base-map.component.html',
  styleUrls: ['./base-map.component.scss']
})
export class BaseMapComponent implements OnInit {

  @Input() baseMap:BaseMap

  @Output() delete:EventEmitter<BaseMap> = new EventEmitter()
  @Output() update:EventEmitter<BaseMap> = new EventEmitter()
  
  environment = environment

  constructor() { }

  ngOnInit(): void {
  }

}
