import { Component, OnInit, Input } from '@angular/core';
import {
  Map
} from '../../../ol-module';
@Component({
  selector: 'app-map-tools',
  templateUrl: './map-tools.component.html',
  styleUrls: ['./map-tools.component.scss']
})
export class MapToolsComponent implements OnInit {

  @Input()map:Map
  constructor() { }

  ngOnInit(): void {
  }

}
