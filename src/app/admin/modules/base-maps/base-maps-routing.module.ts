import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {ListBaseMapComponent} from './pages/list-base-map/list-base-map.component'

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: ListBaseMapComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BaseMapsRoutingModule { }