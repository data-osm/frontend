import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, BehaviorSubject, merge, EMPTY } from 'rxjs';
import { takeUntil, filter, switchMap, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Group } from '../../../../../type/type';
import { AddGroupComponent } from '../add-group/add-group.component';
import { IconService } from '../../../../administration/service/icon.service';
import { MapsService } from '../../../../../data/services/maps.service'
import {manageCompHelper} from '../../../../../../helper/manage-comp.helper'
import { SvgIconDirective } from '../../../../../shared/directive/svg-icon.directive';
import { EditGroupComponent } from '../edit-group/edit-group.component';

@Component({
  selector: 'app-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss']
})
export class ListGroupComponent implements OnInit {

  onAddInstance: () => void
  onUpdateInstance: (group: Group) => void
  onDeleteInstance: (group: Group) => void
  onSelectGroup:(group:Group) => void

  getGroupSelected:() => Subject<Group>
  
  environment = environment

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * group list of a map
   */
  groups$: Observable<Group[]>

  @ViewChildren(SvgIconDirective) svgIcons: QueryList<SvgIconDirective>

  constructor(
    public MapsService: MapsService,
    public IconService: IconService,
    public route: ActivatedRoute,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper:manageCompHelper,
    public translate: TranslateService,
    public router:Router,
  ) {

    this.notifier = notifierService;

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next();
    }

    const onUpdate: Subject<Group> = new Subject<Group>()
    this.onUpdateInstance = (group: Group) => {
      onUpdate.next(group);
    }

    const onDelete: Subject<Group> = new Subject<Group>()
    this.onDeleteInstance = (group: Group) => {
      onDelete.next(group);
    }

    const onGroupSelect: Subject<Group> = new ReplaySubject<Group>(1)
    onGroupSelect.pipe(takeUntil(this.destroyed$))
    this.onSelectGroup = (group:Group)=>{
      onGroupSelect.next(group)
    }

    this.getGroupSelected = ()=>{
      return onGroupSelect
    }
    const isGroupLoading:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
    this.groups$ = merge(
      this.route.params.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(() => {
          isGroupLoading.next(true)
          return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY }),
            tap(()=>{isGroupLoading.next(false)})
          )
        })
      ),
      onAdd.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(() => {
          this.dialog.closeAll()
          return this.dialog.open(AddGroupComponent, { disableClose: false, width: '90%', maxWidth: '90%', maxHeight: '90%', data: Number(this.route.snapshot.paramMap.get('id')) }).afterClosed().pipe(
            filter((response) => response),
            switchMap((value: Object) => {
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY }),
                tap((groups)=>{
                  // this.navigateToGroup([true,groups])
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((group:Group) => {
          return this.dialog.open(EditGroupComponent, { disableClose: false, width: '90%', maxWidth: '90%', maxHeight: '90%', data: group }).afterClosed().pipe(
            filter((response) => response),
            switchMap((value: Object) => {
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
              )
            })
          )
        })
      ),
      onDelete.pipe(
        switchMap((group: Group) => {
          return  this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.detail_map.group.delete'),
            confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation')+ group.name +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.MapsService.deleteGroup(group).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting groups"); return EMPTY }),
                switchMap(()=>{
                  return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                    catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
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
   }

   openGroup(group:Group){
     this.router.navigate([group.group_id],{relativeTo:this.route})
   }

  ngOnInit(): void {
  }

}
