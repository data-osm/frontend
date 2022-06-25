import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
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

  sourceType:'osm'|'querry'|'sigfile'
  
  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes:SimpleChanges){
    if (changes.vectorProvider && this.vectorProvider) {
      if (this.vectorProvider.geometry_type === 'null' && this.sourceType != 'sigfile') {
        this.sourceType = 'sigfile'
      }
    }
  }

}
