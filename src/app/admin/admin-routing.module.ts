import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdministrationComponent} from './administration/administration.component'

const routes: Routes = [
    {
      path: '', 
      component: AdministrationComponent,
     children:[
      {path: 'parameters', loadChildren: () => import('./modules/parameters/parameters.module').then(mod => mod.ParametersModule)},
      {path: 'base-maps', loadChildren: () => import('./modules/base-maps/base-maps.module').then(mod => mod.BasMapsModule)},
      {path: 'user', loadChildren: () => import('./modules/manage-user/manage-user.module').then(mod => mod.ManageUserModule)},
      {path: 'profil', loadChildren: () => import('./modules/profil/profil.module').then(mod => mod.ProfilModule)},
      {path: 'icon', loadChildren: () => import('./modules/icons/icons.module').then(mod => mod.IconsModule)},
      {path: 'vector-provider', loadChildren: () => import('./modules/provider/provider.module').then(mod => mod.ProviderModule)}
    ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
