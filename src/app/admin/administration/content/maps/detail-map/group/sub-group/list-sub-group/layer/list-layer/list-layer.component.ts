import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { MapsService } from '../../../../../../../../service/maps.service'
import {manageCompHelper} from '../../../../../../../../../../../helper/manage-comp.helper'
import { Layer } from '../../../../../../../../../../type/type';
import { EMPTY, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { filter, switchMap, catchError, tap, startWith, withLatestFrom, map, takeUntil, take } from 'rxjs/operators';
@Component({
  selector: 'app-list-layer',
  templateUrl: './list-layer.component.html',
  styleUrls: ['./list-layer.component.scss']
})
/**
 * list all layers of a sub group
 */
export class ListLayerComponent implements OnInit {

  layerList:Observable<Layer[]>

  sub_id:ReplaySubject<number>= new ReplaySubject(1)

  private readonly notifier: NotifierService;
  constructor(
    public MapsService: MapsService,
    public route: ActivatedRoute,
    public router:Router,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper:manageCompHelper,
    public translate: TranslateService,
  ) {

    this.notifier = notifierService;

    this.layerList = merge(
      this.router.events.pipe(
        startWith(undefined),
        filter(e => e instanceof NavigationEnd || e == undefined),
        map(() => this.route.snapshot),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter((route)=>route.component["name"]==="ListLayerComponent"),
        filter((route) =>route.params['sub-id'] != undefined),
        switchMap((route: ActivatedRouteSnapshot) => {
          let parameters = route.params
          this.sub_id.next(Number(parameters['sub-id']))
          return this.MapsService.getAllLayersFromSubGroup(Number(parameters['sub-id'])).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
            tap(()=>{this.sub_id.complete()})
          )
        }),
      )
    )
  }

  ngOnInit(): void {
  }

}
