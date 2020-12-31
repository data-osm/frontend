import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { MapsService } from '../../../../../../service/maps.service'
import {manageCompHelper} from '../../../../../../../../../helper/manage-comp.helper'
import { EMPTY, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { SubGroup } from '../../../../../../../../type/type';
import { filter, switchMap, catchError, tap, startWith, withLatestFrom, map } from 'rxjs/operators';
import { AddSubGroupComponent } from '../add-sub-group/add-sub-group.component';
import { EditSubGroupComponent } from '../edit-sub-group/edit-sub-group.component';

@Component({
  selector: 'app-list-sub-group',
  templateUrl: './list-sub-group.component.html',
  styleUrls: ['./list-sub-group.component.scss']
})
/**
 * list all sub group of a group
 */
export class ListSubGroupComponent implements OnInit {
  onAddInstance:()=>void
  onUpdateInstance:(subGroup:SubGroup)=>void
  subGroupList:Observable<SubGroup[]>

  group_id:ReplaySubject<number>= new ReplaySubject(1)

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
    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onUpdate:Subject<SubGroup> = new Subject<SubGroup>()
    this.onUpdateInstance = (subGroup:SubGroup)=>{
      onUpdate.next(subGroup)
    }

    this.subGroupList = merge(
      this.router.events.pipe(
        startWith(undefined),
        filter(e => e instanceof NavigationEnd || e == undefined),
        filter(()=>this.route.children.length > 0),
        switchMap(()=>{return this.route.firstChild.params}),
        filter((parameters) =>parameters['id-group'] != undefined),
        switchMap((parameters: Params) => {
          this.group_id.next(Number(parameters['id-group']))
          return this.MapsService.getAllSubGroupOfGroup(Number(parameters['id-group'])).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY })
          )
        })
      ),
      this.router.events.pipe(
        startWith(undefined),
        filter(e => e instanceof NavigationEnd || e == undefined),
        filter(()=>this.route.children.length == 0),
        map(()=>{ this.group_id.next(undefined);return []})
      ),
      onAdd.pipe(
        withLatestFrom(this.group_id),
        switchMap((parameters)=>{
          return this.dialog.open(AddSubGroupComponent,{disableClose: false, data: parameters[1] }).afterClosed().pipe(
            filter((response) => response),
            withLatestFrom(this.group_id),
            switchMap((parameters) => {
              return this.MapsService.getAllSubGroupOfGroup(parameters[1]).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY })
              )
            })
          )
        })
        
      ),
      onUpdate.pipe(
        switchMap((subGroup:SubGroup)=>{
          return this.dialog.open(EditSubGroupComponent,{data:subGroup}).afterClosed().pipe(
            filter((response) => response),
            withLatestFrom(this.group_id),
            switchMap((parameters) => {
              return this.MapsService.getAllSubGroupOfGroup(parameters[1]).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY })
              )
            })
          )
        })
      )
    )
  }

  ngOnInit(): void { 
  }

}
