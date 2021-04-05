import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddStyleComponent } from './pages/add-style/add-style.component';
import { AddVectorProviderComponent } from './pages/add-vector-provider/add-vector-provider.component';
import { DetailsVectorProviderComponent } from './pages/details-vector-provider/details-vector-provider.component';
import { EditStyleComponent } from './pages/edit-style/edit-style.component';
import { EditVectorProviderComponent } from './pages/edit-vector-provider/edit-vector-provider.component';
import { ListStyleComponent } from './pages/list-style/list-style.component';
import { ListVectorProviderComponent } from './pages/list-vector-provider/list-vector-provider.component';
import { OsmQuerryComponent } from './pages/osm-querry/osm-querry.component';
import { TableVectorProviderComponent } from './pages/table-vector-provider/table-vector-provider.component';
import { UpdateProviderComponent } from './pages/update-provider/update-provider.component';
import { SharedModule } from '../../../shared/shared.module';
import { ProviderRoutingModule } from './provider-routing.module';
import { QmlComponent } from './pages/qml/qml.component';
import { ClusterComponent } from './pages/cluster/cluster.component';
import { _VIEW_REPEATER_STRATEGY, _DisposeViewRepeaterStrategy } from '@angular/cdk/collections';
import { _CoalescedStyleScheduler, CdkTable, CDK_TABLE } from '@angular/cdk/table';
import { MatTable } from '@angular/material/table';
import { IconsModule } from '../icons/icons.module';



@NgModule({
  declarations: [AddStyleComponent, AddVectorProviderComponent, DetailsVectorProviderComponent, EditStyleComponent, EditVectorProviderComponent,ListStyleComponent, ListVectorProviderComponent, OsmQuerryComponent, EditStyleComponent, AddStyleComponent, TableVectorProviderComponent, UpdateProviderComponent, QmlComponent, ClusterComponent],
  imports: [
    CommonModule,
    SharedModule,
    ProviderRoutingModule,
    IconsModule
  ],
  exports:[
    EditVectorProviderComponent
  ]
  
})
export class ProviderModule { }