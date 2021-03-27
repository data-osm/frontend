import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FileUploadComponent} from './pages/file-upload/file-upload.component'

import { FlexLayoutModule } from '@angular/flex-layout';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new MultiTranslateHttpLoader(httpClient, [
    { prefix: "./assets/i18n/", suffix: ".json" },
    {prefix: './assets/i18n/tags-', suffix: '.json'}
  ]);
}
import {ComponentMaterialModule} from './material-module';
import { NotifierModule } from "angular-notifier";
import { RouterModule } from '@angular/router';
import { SearchProviderComponent } from './pages/search-provider/search-provider.component';


@NgModule({
  declarations: [FileUploadComponent, SearchProviderComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ComponentMaterialModule,
    TranslateModule,
    FlexLayoutModule,
    NotifierModule
  ],
  exports:[
    FileUploadComponent,
    ComponentMaterialModule,
    NotifierModule,
    ComponentMaterialModule,
    FlexLayoutModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    SearchProviderComponent
  ]
})
export class SharedModule {
  constructor(private translate: TranslateService) {
    translate.addLangs(["fr"]);
    translate.setDefaultLang('fr');

    let browserLang = translate.getBrowserLang();
    translate.use(browserLang.match(/fr/) ? browserLang : 'fr');
  }
 }
