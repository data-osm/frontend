import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { BaseMap } from '../../../../../data/models/base-maps';
import { BaseMapsService } from '../../../../../data/services/base-maps.service';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { MatDialog } from '@angular/material/dialog';
import { AddBaseMapComponent } from '../add-base-map/add-base-map.component';
import { UpdateBaseMapComponent } from '../update-base-map/update-base-map.component';

@Component({
  selector: 'app-list-base-map',
  templateUrl: './list-base-map.component.html',
  styleUrls: ['./list-base-map.component.scss']
})
export class ListBaseMapComponent implements OnInit {
  
  onAddInstance:()=>void
  onDeleteInstance:(baseMap:BaseMap)=>void
  onUpdateInstance:(baseMap:BaseMap)=>void
  
  readonly listBaseMaps$:Observable<ReadonlyArray<BaseMap>>
  private readonly notifier: NotifierService;

  constructor(
    public  baseMapsService : BaseMapsService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public manageCompHelper : ManageCompHelper,
    public dialog: MatDialog
  ) {
    this.notifier = notifierService;

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onDelete:Subject<BaseMap> = new Subject<BaseMap>()
    this.onDeleteInstance = (baseMap:BaseMap)=>{
      onDelete.next(baseMap)
    }

    const onUpdate:Subject<BaseMap> = new Subject<BaseMap>()
    this.onUpdateInstance = (baseMap:BaseMap)=>{
      onUpdate.next(baseMap)
    }

    this.listBaseMaps$ = merge(
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open(AddBaseMapComponent,{}).afterClosed().pipe(
            filter(result => result),
          )
        })
      ),
      onUpdate.pipe(
        switchMap((basemap)=>{
          return this.dialog.open(UpdateBaseMapComponent,{data:basemap}).afterClosed().pipe(
            filter(result => result),
          )
        })
      ),
      onDelete.pipe(
        switchMap((baseMap)=>{
          return this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.base-map.delete_confirmation_title'),
            confirmationExplanation: this.translate.instant('admin.base-map.delete_confirmation_explanation')+ baseMap.name +' ' +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(result => result),
            switchMap(()=>{
              return this.baseMapsService.deleteBaseMap(baseMap.id).pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while deleting basemap");
                  return EMPTY 
                })
              )
            })
          )
        })
      )
    ).pipe(
      startWith(undefined),
      shareReplay(1),
      switchMap(()=>{
        return this.baseMapsService.getBaseMaps().pipe(
          catchError((error:HttpErrorResponse) => { 
            this.notifier.notify("error", "An error occured while updating basemaps");
            return EMPTY 
          }),
        )
      })
    )

   }

  ngOnInit(): void {
  }

}
