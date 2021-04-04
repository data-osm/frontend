import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DetailsVectorProviderComponent } from './pages/details-vector-provider/details-vector-provider.component';
import { ListVectorProviderComponent } from './pages/list-vector-provider/list-vector-provider.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: ListVectorProviderComponent,
      },
      {
        path: ':id',
        component: DetailsVectorProviderComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProviderRoutingModule { }