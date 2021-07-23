import { Component, OnInit } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
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
    ){
    translate.setDefaultLang('fr');
    translate.use('fr');
  }

  ngOnInit(): void {
    
  }

}
