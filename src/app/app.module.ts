import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';


import { setAppInjector } from '../helper/app-injector.helper'


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from './shared/shared.module'
import { BackendApiService } from './services/backend-api/backend-api.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { NotifierModule } from "angular-notifier";
import { SocialShareComponent } from './social-share/social-share.component';
import { ShareButtonsModule } from 'ngx-sharebuttons/buttons';
import { ShareIconsModule } from 'ngx-sharebuttons/icons';
import { ManageCompHelper } from '../helper/manage-comp.helper';


import { InfoComponent } from './modal/info/info.component';

import { AuthGuard } from './auth/guard/auth.guard';
import { ConfirmationDialogComponent } from './modal/confirmation-dialog/confirmation-dialog.component';
import { MetadataLayerComponent } from './modal/metadata/metadata.component';
// import { MatomoConsentMode, NgxMatomoTrackerModule } from '@ngx-matomo/tracker';
import { MatomoConsentMode, NgxMatomoModule, NgxMatomoRouterModule, } from 'ngx-matomo-client';
import { environment } from '../environments/environment';
import { DataOsmLayersServiceService } from './services/data-som-layers-service/data-som-layers-service.service';
@NgModule({
  declarations: [
    AppComponent,
    SocialShareComponent,

    InfoComponent,

    ConfirmationDialogComponent,
    MetadataLayerComponent,
  ],
  imports: [
    ShareButtonsModule,
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
    NgxMatomoModule.forRoot({
      // disabled: !environment.production,
      siteId: environment.matomoSiteId,
      trackerUrl: environment.matomoUrl,
      // requireConsent: MatomoConsentMode.TRACKING

    }),
    NgxMatomoRouterModule
    // NgxMatomoTrackerModule.forRoot({
    //   disabled: !environment.production,
    //   siteId: environment.matomoSiteId, 
    //   trackerUrl: environment.matomoUrl,
    //   routeTracking:{},
    //   requireConsent:MatomoConsentMode.COOKIE
    // }),
  ],
  providers: [BackendApiService, DataOsmLayersServiceService, ManageCompHelper, AuthGuard, AuthGuard],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(injector: Injector) {
    setAppInjector(injector);
  }
}
