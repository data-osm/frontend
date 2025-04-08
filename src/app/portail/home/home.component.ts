import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  profilId$: Observable<number>
  constructor(
    private activatedRoute: ActivatedRoute,
  ) {

    this.profilId$ = this.activatedRoute.queryParams.pipe(
      map((parameters) => {
        if (parameters['profil'] == undefined) {
          return 1
        }
        return parseInt(parameters["profil"])
      })
    )

  }
}
