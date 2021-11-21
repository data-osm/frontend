import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';



import { AdminRoutingModule } from './admin-routing.module';
import { AdministrationComponent } from './administration/administration.component';
import { SidenavLeftAdminComponent } from './administration/pages/sidenav-left-admin/sidenav-left-admin.component';
import { NavBarComponent } from './administration/pages/nav-bar/nav-bar.component';

import {SharedModule} from '../shared/shared.module'
import { AddMapComponent } from './administration/pages/add-map/add-map.component';
import { EditMapComponent } from './administration/pages/edit-map/edit-map.component';
import { _VIEW_REPEATER_STRATEGY, _DisposeViewRepeaterStrategy } from '@angular/cdk/collections';
import { _CoalescedStyleScheduler, CdkTable, CDK_TABLE } from '@angular/cdk/table';
import { MatTable } from '@angular/material/table';

@NgModule({
  declarations: [ AdministrationComponent, SidenavLeftAdminComponent, NavBarComponent, AddMapComponent, EditMapComponent],
  imports: [
    CommonModule,
    AdminRoutingModule,
    SharedModule
  ],
  providers:[_CoalescedStyleScheduler,
    {provide: _VIEW_REPEATER_STRATEGY, useClass: _DisposeViewRepeaterStrategy},
    {provide: CdkTable, useExisting: MatTable},
    {provide: CDK_TABLE, useExisting: MatTable},]

})
export class AdminModule { }
