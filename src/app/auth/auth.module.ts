import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { ComponentMaterialModule } from '../shared/material-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

import { HttpBackend, HttpClientModule } from '@angular/common/http';

import { ShareButton } from 'ngx-sharebuttons/button';
import { ShareIconsModule } from 'ngx-sharebuttons/icons';

// AoT requires an exported function for factories
export function HttpLoaderFactory(_httpBackend: HttpBackend) {
  return new MultiTranslateHttpLoader(_httpBackend, [
    { prefix: "./assets/i18n/", suffix: ".json" },
  {prefix: './assets/i18n/tags-', suffix: '.json'}]);
}



@NgModule({
  declarations: [LoginComponent],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ComponentMaterialModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend],
      }
    }),
  ]
})
export class AuthModule { }
