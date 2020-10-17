import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
export function HttpLoaderFactory(httpClient: HttpClient) {
  return new MultiTranslateHttpLoader(httpClient, [
    { prefix: "./assets/i18n/", suffix: ".json" },
    {prefix: './assets/i18n/tags-', suffix: '.json'}
  ]);
}


import { AdminRoutingModule } from './admin-routing.module';
import { AdministrationComponent } from './administration/administration.component';
import {ComponentMaterialModule} from '../material-module';
import { SidenavLeftAdminComponent } from './administration/sidenav-left-admin/sidenav-left-admin.component';
import { NavBarComponent } from './administration/nav-bar/nav-bar.component';
import { IconsComponent } from './administration/content/icons/icons.component'
import { FlexLayoutModule } from '@angular/flex-layout';
import { AddIconComponent } from './administration/content/icons/add-icon/add-icon.component';
import { FileUploadComponent } from './administration/content/icons/add-icon/file-upload/file-upload.component';

@NgModule({
  declarations: [AdministrationComponent, SidenavLeftAdminComponent, NavBarComponent, IconsComponent, AddIconComponent, FileUploadComponent],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ComponentMaterialModule,
    FlexLayoutModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    }),
  ]
})
export class AdminModule { }
