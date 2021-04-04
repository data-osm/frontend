import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListGroupComponent } from './pages/list-group/list-group.component';
import { GroupComponent } from './pages/group/group.component';
import { ProfilRoutingModule } from './profil-routing.module';
import { SharedModule } from '../../../shared/shared.module';
import { AddGroupComponent } from './pages/add-group/add-group.component';
import { EditGroupComponent } from './pages/edit-group/edit-group.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { AddSubGroupComponent } from './pages/add-sub-group/add-sub-group.component';
import { EditSubGroupComponent } from './pages/edit-sub-group/edit-sub-group.component';
import { UpdateSubGroupComponent } from './pages/update-sub-group/update-sub-group.component';
import { IconsModule } from '../icons/icons.module';
import { ListSubGroupComponent } from './pages/list-sub-group/list-sub-group.component';
import { DetailLayerComponent } from './pages/detail-layer/detail-layer.component';
import { ListLayerComponent } from './pages/list-layer/list-layer.component';
import { AddLayerComponent } from './pages/add-layer/add-layer.component';
import { EditLayerProviderComponent } from './pages/detail-layer/edit-layer-provider/edit-layer-provider.component';
import { AddLayerProviderComponent } from './pages/detail-layer/add-layer-provider/add-layer-provider.component';
import { UpdateLayerComponent } from './pages/update-layer/update-layer.component';
import { MetadataComponent } from './pages/detail-layer/metadata/metadata.component';
import { ProviderComponent } from './pages/detail-layer/provider/provider.component';
import { ProviderModule } from '../provider/provider.module';


@NgModule({
  declarations: [DetailLayerComponent,UpdateLayerComponent, MetadataComponent,ProviderComponent, EditLayerProviderComponent, AddLayerProviderComponent ,ListGroupComponent, GroupComponent, AddGroupComponent, EditGroupComponent,AddSubGroupComponent, EditSubGroupComponent, UpdateSubGroupComponent, ListSubGroupComponent, ListLayerComponent, DetailLayerComponent, AddLayerComponent, EditLayerProviderComponent],
  imports: [
    CommonModule,
    ProfilRoutingModule,
    SharedModule,
    IconsModule,
    ColorPickerModule,
    ProviderModule
  ]
})
export class ProfilModule { }
