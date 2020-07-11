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
    DownloadComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ComponentMaterialModule,
    BrowserAnimationsModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
