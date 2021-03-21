import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdministrationComponent} from './administration/administration.component'
import {IconsComponent} from './administration/content/icons/icons.component'
import { ListVectorProviderComponent } from './administration/content/provider/list-vector-provider/list-vector-provider.component';
import { DetailsVectorProviderComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/details-vector-provider.component';
import { DetailMapComponent } from './administration/content/maps/detail-map/detail-map.component';
import { ListSubGroupComponent } from './administration/content/maps/detail-map/group/sub-group/list-sub-group/list-sub-group.component';
import { ListLayerComponent } from './administration/content/maps/detail-map/group/sub-group/list-sub-group/layer/list-layer/list-layer.component';

const routes: Routes = [
  {path: '', component: AdministrationComponent, children:[
    {
      path:'map/:id',
      component:DetailMapComponent,
      children:[
        {
          path:':id-group',
          component:ListSubGroupComponent,
          children:[
            {
              path:':sub-id',
              component:ListLayerComponent
            }
          ]
        }
      ]
    },
    {
      path:'icon',
      component:IconsComponent
    },
    {
      path:'vector-provider',
      component:ListVectorProviderComponent
    },
    {
      path:'vector-provider/:id',
      component:DetailsVectorProviderComponent
    },
    {path: 'base-maps', loadChildren: () => import('./modules/base-maps/base-maps.module').then(mod => mod.BasMapsModule)},
    {path: 'user', loadChildren: () => import('./modules/manage-user/manage-user.module').then(mod => mod.ManageUserModule)}

  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
