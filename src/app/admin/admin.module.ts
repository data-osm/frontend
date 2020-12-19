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
import { AddVectorProviderComponent } from './administration/content/provider/add-vector-provider/add-vector-provider.component';
import { ListVectorProviderComponent } from './administration/content/provider/list-vector-provider/list-vector-provider.component';
import { CdkTable, CDK_TABLE, _CoalescedStyleScheduler} from '@angular/cdk/table';
import { _VIEW_REPEATER_STRATEGY, _DisposeViewRepeaterStrategy } from '@angular/cdk/collections';
import { MatTable } from '@angular/material/table';
import { DetailsVectorProviderComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/details-vector-provider.component';
import { OsmQuerryComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/osm-querry/osm-querry.component';
import { TableVectorProviderComponent } from './administration/content/provider/list-vector-provider/table-vector-provider/table-vector-provider.component';
import { ListStyleComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/list-style/list-style.component';
import { AddStyleComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/list-style/add-style/add-style.component';
import { EditStyleComponent } from './administration/content/provider/list-vector-provider/details-vector-provider/list-style/edit-style/edit-style.component';
import { PreviewDataComponent } from './administration/modal/preview-data/preview-data.component';
import { DetailMapComponent, SvgIcon } from './administration/content/maps/detail-map/detail-map.component';
import { AddMapComponent } from './administration/content/maps/add-map/add-map.component';
import { EditMapComponent } from './administration/content/maps/edit-map/edit-map.component';
import { AddGroupComponent } from './administration/content/maps/detail-map/group/add-group/add-group.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { SafeStylePipe } from '../pipe/safe-style.pipe';
import { GenerateIconComponent } from './administration/generate-icon/generate-icon.component';
import { EditGroupComponent } from './administration/content/maps/detail-map/group/edit-group/edit-group.component';

@NgModule({
  declarations: [SvgIcon, SafeStylePipe, AdministrationComponent, SidenavLeftAdminComponent, NavBarComponent, IconsComponent, AddIconComponent, FileUploadComponent, AddVectorProviderComponent, ListVectorProviderComponent, DetailsVectorProviderComponent, OsmQuerryComponent, TableVectorProviderComponent, ListStyleComponent, AddStyleComponent, EditStyleComponent, PreviewDataComponent, DetailMapComponent, AddMapComponent, EditMapComponent, AddGroupComponent, GenerateIconComponent, EditGroupComponent],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ComponentMaterialModule,
    FlexLayoutModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    ColorPickerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    }),
  ],
  providers:[_CoalescedStyleScheduler,
    {provide: _VIEW_REPEATER_STRATEGY, useClass: _DisposeViewRepeaterStrategy},
    {provide: CdkTable, useExisting: MatTable},
    {provide: CDK_TABLE, useExisting: MatTable},]
})
export class AdminModule { }
