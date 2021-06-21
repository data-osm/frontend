import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DownloadComponent } from './download.component';
import { SharedModule } from '../shared/shared.module';
import { SearchAdminBoundaryComponent } from './pages/search-admin-boundary/search-admin-boundary.component';
import { SearchLayerComponent } from './pages/search-layer/search-layer.component';



@NgModule({
  declarations: [DownloadComponent, SearchLayerComponent, SearchAdminBoundaryComponent],
  imports: [
    CommonModule,
    SharedModule,
  ],
  exports:[DownloadComponent]
})
export class DownloadModule { }
