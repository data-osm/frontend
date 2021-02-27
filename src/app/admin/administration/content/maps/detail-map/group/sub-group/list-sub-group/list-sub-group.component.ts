import { Component, Input, OnInit, QueryList, ViewChild } from '@angular/core';
import {Location} from '@angular/common'; 
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { MapsService } from '../../../../../../service/maps.service'
import { manageCompHelper } from '../../../../../../../../../helper/manage-comp.helper'
import { combineLatest, EMPTY, iif, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { SubGroup } from '../../../../../../../../type/type';
import { filter, switchMap, catchError, tap, startWith, withLatestFrom, map, mergeMap, takeUntil, shareReplay, debounceTime, distinct, distinctUntilKeyChanged } from 'rxjs/operators';
import { AddSubGroupComponent } from '../add-sub-group/add-sub-group.component';
import { EditSubGroupComponent } from '../edit-sub-group/edit-sub-group.component';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ViewChildren } from '@angular/core';

@Component({
  selector: 'app-list-sub-group',
  templateUrl: './list-sub-group.component.html',
  styleUrls: ['./list-sub-group.component.scss']
})
/**
 * list all sub group of a group
 */
export class ListSubGroupComponent implements OnInit {
  onAddInstance: () => void
  onUpdateInstance: (subGroup: SubGroup) => void
  onDeleteInstance: (subGroup: SubGroup) => void
  onSelectSubGroup:(subGroup:SubGroup) => void
  getSubGroupSelected:() => Subject<SubGroup>


  subGroupList$: Observable<SubGroup[]>

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  group_id: ReplaySubject<number> = new ReplaySubject(1)

  private readonly notifier: NotifierService;
  @ViewChild(MatTabGroup) matGroup: MatTabGroup
  
  constructor(
    public MapsService: MapsService,
    public route: ActivatedRoute,
    public router: Router,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper: manageCompHelper,
    public translate: TranslateService,
  ) {

    this.notifier = notifierService;

   

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next()
    }

    const onUpdate: Subject<SubGroup> = new Subject<SubGroup>()
    this.onUpdateInstance = (subGroup: SubGroup) => {
      onUpdate.next(subGroup)
    }

    const onDelete: Subject<SubGroup> = new Subject<SubGroup>()
    this.onDeleteInstance = (subGroup: SubGroup) => {
      onDelete.next(subGroup);
    }

    this.subGroupList$ = merge(
      this.router.events.pipe(
        startWith(undefined),
        filter(e => e instanceof NavigationEnd || e == undefined),
        filter(() => this.route.children.length > 0),
        switchMap(() => { return this.route.firstChild.params }),
        filter((parameters) => parameters['id-group'] != undefined),
        distinctUntilKeyChanged('id-group'),
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
        filter(() => this.route.children.length == 0),
        map(() => { this.group_id.next(undefined); return [] })
      ),
      onAdd.pipe(
        withLatestFrom(this.group_id),
        switchMap((parameters) => {
          return this.dialog.open(AddSubGroupComponent, { disableClose: false, data: parameters[1] }).afterClosed().pipe(
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
        switchMap((subGroup: SubGroup) => {
          return this.dialog.open(EditSubGroupComponent, { data: subGroup }).afterClosed().pipe(
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
      onDelete.pipe(
        switchMap((subGroup: SubGroup) => {
          return this.manageCompHelper.openConfirmationDialog([],
            {
              confirmationTitle: this.translate.instant('admin.sub_group.delete'),
              confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation') + subGroup.name + ' ?',
              cancelText: this.translate.instant('cancel'),
              confirmText: this.translate.instant('delete'),
            }
          ).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(() => {
              return this.MapsService.deleteSubGroup(subGroup).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting sub group"); return EMPTY }),
                withLatestFrom(this.group_id),
                switchMap((parameters) => {
                  return this.MapsService.getAllSubGroupOfGroup(parameters[1]).pipe(
                    catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY })
                  )
                })
              )
            })
          )
        })
      )
    ).pipe(
      shareReplay(1)
    )

    combineLatest(this.router.events.pipe(startWith(of(undefined))), this.subGroupList$).pipe(
      debounceTime(250),
      filter(e => e[0] instanceof NavigationEnd || e[0] == undefined),
      map(() => this.route.snapshot),
      map((route) => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter((route)=> route.component["name"] === "ListLayerComponent"),
      mergeMap(route =>
        iif( () =>
          route.params['sub-id'] != undefined,
          of<Params>(route.params),
          of<true>(true)
        )

      ),
      withLatestFrom(this.subGroupList$),
      tap((parameters) => {
        this.navigateToSubGroup(parameters)
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

    combineLatest(this.router.events.pipe(startWith(of(undefined))), this.subGroupList$).pipe(
      debounceTime(250),
      filter(e => e[0] instanceof NavigationEnd || e[0] == undefined),
      map(() => this.route.snapshot),
      map((route) => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter((route)=> route.component["name"] != "ListLayerComponent"),
      withLatestFrom(this.subGroupList$),
      tap((parameters) => {
        this.navigateToSubGroup([true,parameters[1]])
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  navigateToSubGroup(parameters:[Params|true, SubGroup[]]):void{
    if (typeof parameters[0] === 'boolean' && parameters[1].length>0) {
      this.router.navigate([parameters[1][0].group_sub_id], { relativeTo: this.route.firstChild })
    }else if(parameters[0]['sub-id'] != undefined ){
      parameters[1]
      .map((subGroup:SubGroup)=>{
        if (subGroup.group_sub_id == Number(parameters[0]['sub-id'])) {
          this.onSelectSubGroup(subGroup)
        }
      })
    }
  }

  goToSubGroup(index:number,subGroupList:Array<SubGroup>):void{
    let subGroup = subGroupList[index]
    this.router.navigate([subGroup.group,subGroup.group_sub_id], { relativeTo: this.route })
  }

  findIndexOfSubGroup(subGroup:SubGroup, listGroup:Array<SubGroup>):number{
    if (listGroup && subGroup) {
      return listGroup.findIndex(x=>x.group_sub_id===subGroup.group_sub_id)
      
    }
    
    return 0
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(){
    const onSubGroupSelect: Subject<SubGroup> = new ReplaySubject<SubGroup>(1)
   
    this.onSelectSubGroup = (subGroup:SubGroup)=>{
      onSubGroupSelect.next(subGroup)
    }

    this.getSubGroupSelected = ()=>{
      return onSubGroupSelect
    }

    combineLatest(onSubGroupSelect,this.subGroupList$).pipe(
      tap((parameters:[SubGroup, SubGroup[]])=>{
        this.matGroup.selectedIndex = this.findIndexOfSubGroup(parameters[0],parameters[1])
      }),
      takeUntil(this.destroyed$)
    ).subscribe()
  
  }

}
