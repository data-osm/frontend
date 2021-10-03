import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ListUserComponent } from './pages/list-user/list-user.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: ListUserComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManageUserRoutingModule { }