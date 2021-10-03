import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PortailMapComponent } from './portail-map/portail-map.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PortailMapComponent,
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortailRoutingModule { }