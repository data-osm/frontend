import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdministrationComponent} from './administration/administration.component'

const routes: Routes = [
  {path: '', component: AdministrationComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
