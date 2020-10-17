import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-administration',
  templateUrl: './administration.component.html',
  styleUrls: ['./administration.component.scss']
})
export class AdministrationComponent implements OnInit {

  constructor(
    public translate: TranslateService,

  ) { 
    translate.setDefaultLang('fr');
  }

  ngOnInit(): void {
  }

}
