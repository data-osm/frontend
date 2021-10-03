import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ListGroupComponent } from './pages/list-group/list-group.component';
import { ListLayerComponent } from './pages/list-layer/list-layer.component';
import { ListSubGroupComponent } from './pages/list-sub-group/list-sub-group.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: ':id',
        component: ListGroupComponent,
         
      },
      {
        path:':id/:id-group',
        component:ListSubGroupComponent,
        children:[{
          path:':sub-id',
          component:ListLayerComponent,
        }]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfilRoutingModule { }