import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { VectorProvider } from '../../../../../type/type';

@Component({
  selector: 'app-source-vector-provider',
  templateUrl: './source-vector-provider.component.html',
  styleUrls: ['./source-vector-provider.component.scss']
})
export class SourceVectorProviderComponent implements OnInit {
  @Input()vectorProvider:VectorProvider
    /**
   * reload vector provider
   */
  @Output()reloadVectorProvider:EventEmitter<void> = new EventEmitter<void>()

  sourceType:'osm'|'querry'
  
  constructor() { }

  ngOnInit(): void {
  }

}
