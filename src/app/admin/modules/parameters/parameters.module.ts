import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import {SharedModule} from '../../../shared/shared.module'
import { ParametersRoutingModule } from './parameters-routing.module';
import { AddBoundaryComponent } from './pages/add-boundary/add-boundary.component';
import { UpdateParameterComponent } from './pages/update-parameter/update-parameter.component';



@NgModule({
  declarations: [DashboardComponent, AddBoundaryComponent, UpdateParameterComponent],
  imports: [
    CommonModule,
    SharedModule,
    ParametersRoutingModule
  ]
})
export class ParametersModule { }
