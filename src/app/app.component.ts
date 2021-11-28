import { Component, OnInit } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import { MatomoTracker } from '@ngx-matomo/tracker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'geosm-frontend';

  constructor(
    public translate: TranslateService,
    private readonly tracker: MatomoTracker
    ){
    translate.setDefaultLang('fr');
    translate.use('fr');
  }

  ngOnInit(): void {
    this.tracker.trackPageView('App component');
  }

}
