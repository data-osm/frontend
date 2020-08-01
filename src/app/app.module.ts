import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {TranslateModule,TranslateLoader} from '@ngx-translate/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MapComponent } from './map/map.component';
import {ComponentMaterialModule} from './material-module';
import { HeaderComponent } from './header/header.component';
import { VerticalToolbarComponent } from './map/vertical-toolbar/vertical-toolbar.component';
import { TableOfContentsComponent } from './map/sidenav-right/table-of-contents/table-of-contents.component';
import { MapToolsComponent } from './map/sidenav-right/map-tools/map-tools.component';
import { RoutingComponent } from './map/sidenav-right/routing/routing.component';
import { LegendComponent } from './map/sidenav-right/legend/legend.component';
import { DownloadComponent } from './map/sidenav-right/download/download.component'
import { StorageServiceService } from './services/storage-service/storage-service.service';
import { BackendApiService } from './services/backend-api/backend-api.service';
import { SidenaveLeftPrincipalComponent } from './map/sidenav-left/sidenave-left-principal/sidenave-left-principal.component';
import { DrawComponent } from './map/sidenav-right/map-tools/draw/draw.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { NotifierModule } from "angular-notifier";
import { SocialShareComponent } from './social-share/social-share.component';
import { ShareButtonsModule } from 'ngx-sharebuttons/buttons';
import { ShareIconsModule } from 'ngx-sharebuttons/icons';
import {manageCompHelper} from '../helper/manage-comp.helper';
import { MeasureComponent } from './map/sidenav-right/map-tools/measure/measure.component';
import { AltimetryComponent } from './map/sidenav-right/map-tools/altimetry/altimetry.component';
import { CommentComponent } from './map/sidenav-right/map-tools/comment/comment.component';
import { PrintComponent } from './map/sidenav-right/map-tools/print/print.component';
import { GroupCarteComponent } from './map/sidenav-left/sidenave-left-principal/group-carte/group-carte.component';
import { GroupThematiqueComponent } from './map/sidenav-left/sidenave-left-principal/group-thematique/group-thematique.component';
import { SidenaveLeftSecondaireComponent } from './map/sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component'
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgpSortModule } from "ngp-sort-pipe";
import { ListGroupThematiqueComponent } from './map/sidenav-left/sidenave-left-secondaire/list-group-thematique/list-group-thematique.component';
import { ListGroupCarteComponent } from './map/sidenav-left/sidenave-left-secondaire/list-group-carte/list-group-carte.component';
import { CoucheThematiqueComponent } from './map/sidenav-left/sidenave-left-secondaire/list-group-thematique/couche-thematique/couche-thematique.component';
import { CarteThematiqueComponent } from './map/sidenav-left/sidenave-left-secondaire/list-group-carte/carte-thematique/carte-thematique.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    HeaderComponent,
    VerticalToolbarComponent,
    TableOfContentsComponent,
    MapToolsComponent,
    RoutingComponent,
    LegendComponent,
    DownloadComponent,
    SidenaveLeftPrincipalComponent,
    DrawComponent,
    SocialShareComponent,
    MeasureComponent,
    AltimetryComponent,
    CommentComponent,
    PrintComponent,
    GroupCarteComponent,
    GroupThematiqueComponent,
    SidenaveLeftSecondaireComponent,
    ListGroupThematiqueComponent,
    ListGroupCarteComponent,
    CoucheThematiqueComponent,
    CarteThematiqueComponent
  ],
  imports: [
    ShareButtonsModule.withConfig({
      debug: false
    }),
    NgpSortModule,
    ShareIconsModule,
    BrowserModule,
    AppRoutingModule,
    ComponentMaterialModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    ColorPickerModule,
    NotifierModule,
    FlexLayoutModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    })
  ],
  providers: [StorageServiceService,BackendApiService,manageCompHelper],
  bootstrap: [AppComponent]
})
export class AppModule { }
