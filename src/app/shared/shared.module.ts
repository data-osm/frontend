import { NgModule } from '@angular/core';
import {FileUploadComponent} from './pages/file-upload/file-upload.component'

import { FlexLayoutModule } from 'ngx-flexible-layout';
import { HttpBackend, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

import { LMarkdownEditorModule, MarkdownEditorComponent } from 'ngx-markdown-editor';
import { ShareButton } from 'ngx-sharebuttons/button';
import { ShareIconsModule } from 'ngx-sharebuttons/icons';

// AoT requires an exported function for factories
export function HttpLoaderFactory(_httpBackend: HttpBackend) {
  return new MultiTranslateHttpLoader(_httpBackend, [
    { prefix: "./assets/i18n/", suffix: ".json" },
  {prefix: './assets/i18n/tags-', suffix: '.json'}]);
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
import { MatLegacyTable as MatTable } from '@angular/material/legacy-table';
import { SafeUrlPipe } from './pipe/safe-url/safe-url.pipe';
import { CardDownloadLayerComponent } from './pages/card-download-layer/card-download-layer.component';
import { ColorPickerComponent } from './pages/color-picker/color-picker.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { HttpErrorComponent } from './pages/http-error/http-error.component';
import { CommonModule } from '@angular/common';

@NgModule({
    declarations: [FileUploadComponent,ColorPickerComponent, SearchProviderComponent, SearchMapComponent, SvgIconDirective, PreviewDataComponent, SafeStylePipe, SafeUrlPipe, CardDownloadLayerComponent, HttpErrorComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ComponentMaterialModule,
    TranslateModule,
    FlexLayoutModule,
    NotifierModule,
    ShareIconsModule,
    LMarkdownEditorModule,
    ColorPickerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend],
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
    ShareIconsModule,
    MarkdownEditorComponent,
    ColorPickerComponent,
    ColorPickerModule,
    HttpErrorComponent
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
