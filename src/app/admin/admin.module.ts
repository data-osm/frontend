import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdministrationComponent } from './administration/administration.component';
import {ComponentMaterialModule} from '../material-module';
import { SidenavLeftAdminComponent } from './administration/sidenav-left-admin/sidenav-left-admin.component'

@NgModule({
  declarations: [AdministrationComponent, SidenavLeftAdminComponent],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ComponentMaterialModule
  ]
})
export class AdminModule { }
