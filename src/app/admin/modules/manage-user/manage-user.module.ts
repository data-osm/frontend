import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {SharedModule} from '../../../shared/shared.module'

import { ManageUserRoutingModule } from './manage-user-routing.module';
import { ListUserComponent } from './pages/list-user/list-user.component';
import { AddUserComponent } from './pages/add-user/add-user.component';


@NgModule({
  declarations: [ListUserComponent, AddUserComponent],
  imports: [
    CommonModule,
    ManageUserRoutingModule,
    SharedModule,
  ]
})
export class ManageUserModule { }