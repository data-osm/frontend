import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PortailMapComponent } from './portail-map/portail-map.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: HomeComponent,
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortailRoutingModule { }