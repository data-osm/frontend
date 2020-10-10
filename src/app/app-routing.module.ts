import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {MapComponent} from './map/map.component'

const routes: Routes = [
  { path: 'map', component: MapComponent}, 
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  {path: 'login', loadChildren: () => import('./auth/auth.module').then(mod => mod.AuthModule)}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
