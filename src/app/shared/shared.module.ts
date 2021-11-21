import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FileUploadComponent} from './pages/file-upload/file-upload.component'

import { FlexLayoutModule } from '@angular/flex-layout';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

import { LMarkdownEditorModule, MarkdownEditorComponent } from 'ngx-markdown-editor';
// import { LMarkdownEditorModule } from 'ngx-markdown-editor';


export function HttpLoaderFactory(httpClient: HttpClient) {
  return new MultiTranslateHttpLoader(httpClient, [
    { prefix: "./assets/i18n/", suffix: ".json" },
    {prefix: './assets/i18n/tags-', suffix: '.json'}
  ]);
}
import {ComponentMaterialModule} from './material-module';
import { NotifierModule } from "angular-notifier";
import { RouterModule } from '@angular/router';
import { SvgIconDirective } from './directive/svg-icon.directive';
import { SearchMapComponent } from './pages/search-map/search-map.component';
import { SearchProviderComponent } from './pages/search-provider/search-provider.component';
import { SafeStylePipe } from './pipe/safe-style.pipe';
import { PreviewDataComponent } from './pages/preview-data/preview-data.component';
import { _VIEW_REPEATER_STRATEGY, _DisposeViewRepeaterStrategy } from '@angular/cdk/collections';
import { _CoalescedStyleScheduler, CdkTable, CDK_TABLE } from '@angular/cdk/table';
import { MatTable } from '@angular/material/table';
import { SafeUrlPipe } from './pipe/safe-url/safe-url.pipe';
import { CardDownloadLayerComponent } from './pages/card-download-layer/card-download-layer.component';


@NgModule({
  declarations: [FileUploadComponent, SearchProviderComponent, SearchMapComponent, SvgIconDirective, PreviewDataComponent, SafeStylePipe, SafeUrlPipe, CardDownloadLayerComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ComponentMaterialModule,
    TranslateModule,
    FlexLayoutModule,
    NotifierModule,
    LMarkdownEditorModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    }),
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
    SearchProviderComponent,
    SearchMapComponent,
    SvgIconDirective,
    PreviewDataComponent,
    SafeStylePipe,
    SafeUrlPipe,
    CardDownloadLayerComponent,
    MarkdownEditorComponent
  ],
  providers:[_CoalescedStyleScheduler,
    {provide: _VIEW_REPEATER_STRATEGY, useClass: _DisposeViewRepeaterStrategy},
    {provide: CdkTable, useExisting: MatTable},
    {provide: CDK_TABLE, useExisting: MatTable},]
})
export class SharedModule {
  constructor(private translate: TranslateService) {
    translate.addLangs(["fr"]);
    translate.setDefaultLang('fr');

    let browserLang = translate.getBrowserLang();
    translate.use(browserLang.match(/fr/) ? browserLang : 'fr');
  }
 }
