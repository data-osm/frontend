import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {SharedModule} from '../../../shared/shared.module'


import { ListBaseMapComponent } from './pages/list-base-map/list-base-map.component';
import { BaseMapComponent } from './pages/base-map/base-map.component';
import { BaseMapsRoutingModule } from './base-maps-routing.module';
import { AddBaseMapComponent } from './pages/add-base-map/add-base-map.component';



@NgModule({
  declarations: [ListBaseMapComponent, BaseMapComponent, AddBaseMapComponent],
  imports: [
    CommonModule,
    BaseMapsRoutingModule,
    SharedModule,
  ]
})
export class BasMapsModule { }
