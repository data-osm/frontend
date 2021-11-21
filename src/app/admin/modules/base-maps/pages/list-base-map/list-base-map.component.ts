import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { BaseMap } from '../../../../../data/models/base-maps';
import { BaseMapsService } from '../../../../../data/services/base-maps.service';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { MatDialog } from '@angular/material/dialog';
import { AddBaseMapComponent } from '../add-base-map/add-base-map.component';
import { UpdateBaseMapComponent } from '../update-base-map/update-base-map.component';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-list-base-map',
  templateUrl: './list-base-map.component.html',
  styleUrls: ['./list-base-map.component.scss']
})
export class ListBaseMapComponent implements OnInit {
  
  onAddInstance:()=>void
  onDeleteInstance:(baseMap:BaseMap)=>void
  onUpdateInstance:(baseMap:BaseMap)=>void
  onSetPrinciaplInstance:(baseMap:BaseMap)=>void
  
  readonly listBaseMaps$:Observable<ReadonlyArray<BaseMap>>
  private readonly notifier: NotifierService;

  principalMapForm:FormGroup = this.fb.group({
    principal:new FormControl('')
  })
  constructor(
    public  baseMapsService : BaseMapsService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public manageCompHelper : ManageCompHelper,
    public dialog: MatDialog,
    public fb:FormBuilder
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

    const onSetPrinciapl:Subject<BaseMap> = new Subject<BaseMap>()
    this.onSetPrinciaplInstance = (baseMap:BaseMap)=>{
      onSetPrinciapl.next(baseMap)
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
      this.principalMapForm.get('principal').valueChanges.pipe(
        filter((id)=>id!=undefined),
        switchMap((id)=>{
          return this.baseMapsService.setBaseMapPrincipal(id).pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while setting basemap as principal");
              return EMPTY 
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
          tap((baseMaps)=>{
            let principalBaseMap = baseMaps.find((baseMap)=>baseMap.principal)
            if (principalBaseMap) {
              this.principalMapForm.get('principal').setValue(principalBaseMap.id,{emitEvent:false})
            }
          })
        )
      })
    )

   }

  ngOnInit(): void {
  }

}
