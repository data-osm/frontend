import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { IconsComponent } from './pages/icons/icons.component';
import { UpdateIconComponent } from './pages/update-icon/update-icon.component';
import { AddIconComponent } from './pages/add-icon/add-icon.component';
import { IconRoutingModule } from './icon-routing.module';
import { GenerateIconComponent } from './pages/generate-icon/generate-icon.component';
import { UpdateTagsComponent } from './pages/update-tags/update-tags.component';


@NgModule({
  declarations: [IconsComponent, UpdateIconComponent, AddIconComponent, GenerateIconComponent, UpdateTagsComponent],
  imports: [
    CommonModule,
    SharedModule,
    IconRoutingModule,
  ],
  exports:[GenerateIconComponent, IconsComponent]
})
export class IconsModule { }
