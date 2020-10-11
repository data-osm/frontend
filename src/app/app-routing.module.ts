import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {MapComponent} from './map/map.component'
import {IsauthGuard} from './auth/guard/isauth.guard'
import {AuthGuard} from './auth/guard/auth.guard'

const routes: Routes = [
  { path: 'map', component: MapComponent}, 
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  {path: 'login', loadChildren: () => import('./auth/auth.module').then(mod => mod.AuthModule),canActivate: [IsauthGuard]},
  {path: 'admin', loadChildren: () => import('./admin/admin.module').then(mod => mod.AdminModule), canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
