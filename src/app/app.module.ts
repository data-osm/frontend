import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new MultiTranslateHttpLoader(httpClient, [
    { prefix: "./assets/i18n/", suffix: ".json" },
    {prefix: './assets/i18n/tags-', suffix: '.json'}
  ]);
}

import {setAppInjector} from '../helper/app-injector.helper'


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {SharedModule} from './shared/shared.module'
import { BackendApiService } from './services/backend-api/backend-api.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { NotifierModule } from "angular-notifier";
import { SocialShareComponent } from './social-share/social-share.component';
import { ShareButtonsModule } from 'ngx-sharebuttons/buttons';
import { ShareIconsModule } from 'ngx-sharebuttons/icons';
import { ManageCompHelper } from '../helper/manage-comp.helper';

import { FlexLayoutModule } from '@angular/flex-layout';
import { NgpSortModule } from "ngp-sort-pipe";


import { MultiTranslateHttpLoader } from "ngx-translate-multi-http-loader";
import { InfoComponent } from './modal/info/info.component';

import { AuthGuard } from './auth/guard/auth.guard';
import { ConfirmationDialogComponent } from './modal/confirmation-dialog/confirmation-dialog.component';
import { MetadataLayerComponent } from './modal/metadata/metadata.component';
import { MatomoConsentMode, NgxMatomoTrackerModule } from '@ngx-matomo/tracker';

import { environment } from '../environments/environment';
@NgModule({
  declarations: [
    AppComponent,
    SocialShareComponent,
    
    InfoComponent,

    ConfirmationDialogComponent,
    MetadataLayerComponent
  ],
  imports: [
    ShareButtonsModule.withConfig({
      debug: false
    }),
    NgpSortModule,
    ShareIconsModule,
    BrowserModule,
    AppRoutingModule,
    SharedModule,
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
    }),
    NgxMatomoTrackerModule.forRoot({
      disabled: !environment.production,
      siteId: environment.matomoSiteId, 
      trackerUrl: environment.matomoUrl, 
      requireConsent:MatomoConsentMode.COOKIE
    }),
  ],
  providers: [BackendApiService, ManageCompHelper, AuthGuard, AuthGuard],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(injector: Injector) {
    setAppInjector(injector);
  }
}
