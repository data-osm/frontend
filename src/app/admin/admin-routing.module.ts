import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {AdministrationComponent} from './administration/administration.component'
import {IconsComponent} from './administration/content/icons/icons.component'
const routes: Routes = [
  {path: '', component: AdministrationComponent, children:[
    {
      path:'icon',
      component:IconsComponent
    }
  ]
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
