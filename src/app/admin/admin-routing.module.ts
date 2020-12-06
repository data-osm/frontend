import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdministrationComponent} from './administration/administration.component'
import {IconsComponent} from './administration/content/icons/icons.component'
import { ListVectorProviderComponent } from './administration/content/provider/list-vector-provider/list-vector-provider.component';
import { DetailsVectorProviderComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/details-vector-provider.component';
import { DetailMapComponent } from './administration/content/maps/detail-map/detail-map.component';

const routes: Routes = [
  {path: '', component: AdministrationComponent, children:[
    {
      path:'map/:id',
      component:DetailMapComponent
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
    }
  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
