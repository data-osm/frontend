import { Component, OnInit } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {StorageServiceService} from './services/storage-service/storage-service.service'
import * as $ from 'jquery';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'geosm-frontend';

  constructor(
    public translate: TranslateService,
    public StorageServiceService:StorageServiceService
    ){
    translate.setDefaultLang('fr');
    translate.use('fr');
  }

  ngOnInit(): void {
    
  }

}
