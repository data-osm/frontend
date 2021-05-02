import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap } from 'rxjs/operators';
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
  
  onInitInstance:()=>void
  onAddInstance:()=>void
  onDeleteInstance:(baseMap:BaseMap)=>void
  onUpdateInstance:(baseMap:BaseMap)=>void
  
  listBaseMaps$:Observable<BaseMap[]>
  private readonly notifier: NotifierService;

  constructor(
    public  baseMapsService : BaseMapsService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public manageCompHelper : ManageCompHelper,
    public dialog: MatDialog
  ) {
    this.notifier = notifierService;

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onAdd:Subject<void> = new ReplaySubject<void>(1)
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
      onInit.pipe(
        switchMap(()=>{
          return this.baseMapsService.getBaseMaps().pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while loading basemaps");
              return EMPTY 
            }),
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open(AddBaseMapComponent,{}).afterClosed().pipe(
            filter(result => result),
            switchMap(()=>{
              return this.baseMapsService.getBaseMaps().pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while loading basemaps");
                  return EMPTY 
                }),
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((basemap)=>{
          return this.dialog.open(UpdateBaseMapComponent,{data:basemap}).afterClosed().pipe(
            filter(result => result),
            switchMap(()=>{
              return this.baseMapsService.getBaseMaps().pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while loading basemaps");
                  return EMPTY 
                }),
              )
            })
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
                }),
                switchMap(()=>{
                  return this.baseMapsService.getBaseMaps().pipe(
                    catchError((error:HttpErrorResponse) => { 
                      this.notifier.notify("error", "An error occured while loading basemaps");
                      return EMPTY 
                    }),
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

  ngOnInit(): void {
    this.onInitInstance()
  }

}
