import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { AdminBoundary, Parameter } from '../../../../../data/models/parameters';
import { ParametersService } from '../../../../../data/services/parameters.service';
import { AddBoundaryComponent } from '../add-boundary/add-boundary.component';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { UpdateParameterComponent } from '../update-parameter/update-parameter.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public onInitInstance:()=>void
  public onAddAdministrativeBoundaryInstance:()=>void
  public onAddParameterInstance:()=>void
  public onUpdateAdministrativeBoundaryInstance:(adminBoundary:AdminBoundary)=>void
  public onDeleteAdministrativeBoundaryInstance:(adminBoundary:AdminBoundary)=>void
  public onUpdateAParameterInstance:(parameter:Parameter)=>void
  public onUpdateInfoInstance:(parameter:Parameter)=>void
  /**
   * make the info message editable
   */
  public onEditMarDownInfo:()=>void
  public cancelEditMarkDown:()=>void
  /**
   * use as ngmodel to update info
   */
  info:string
  /**
   * use to compare with the updated one
   */
   infoInitial:string
  /**
   * Mardown edior mode
   */
  markDownEditorMode:'editor'|'preview' = 'preview'
  parameter$:Observable<Parameter>

  displayedColumnsAdminBoundary:Array<string> = ['name','source','action']

  constructor(
    public parametersService:ParametersService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog: MatDialog,
    public manageCompHelper : ManageCompHelper,
  ) {
    this.onEditMarDownInfo = ()=>{
      this.markDownEditorMode = 'editor'
    }

    this.cancelEditMarkDown = ()=>{
      this.markDownEditorMode='preview'
      this.info=this.infoInitial
    }

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onDeleteAdministrative:Subject<AdminBoundary> = new Subject<AdminBoundary>()
    this.onDeleteAdministrativeBoundaryInstance = (adminBoundary:AdminBoundary)=>{
      onDeleteAdministrative.next(adminBoundary)
    }

    const onAddAdministrativeBoundary:Subject<void> = new Subject<void>()
    this.onAddAdministrativeBoundaryInstance = ()=>{
      onAddAdministrativeBoundary.next()
    }

    const onUpdateAParameterInstance:Subject<Parameter> = new Subject<Parameter>()
    this.onUpdateAParameterInstance = (parameter:Parameter)=>{
      onUpdateAParameterInstance.next(parameter)
    }

    const onUpdateInfo:Subject<Parameter> = new Subject<Parameter>()
    this.onUpdateInfoInstance= (parameter:Parameter)=>{
      onUpdateInfo.next(parameter)
    }

    this.parameter$ = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.parametersService.getParameters().pipe(
            catchError((error:HttpErrorResponse) => { 
              notifierService.notify("error", "An error occured while loading parameters");
              return EMPTY 
            }),
          )
        })
      ),
      onAddAdministrativeBoundary.pipe(
        switchMap(()=>{
          return this.dialog.open(AddBoundaryComponent).afterClosed().pipe(
            filter(validation => validation),
            switchMap(()=>{
              return this.parametersService.getParameters().pipe(
                catchError((error:HttpErrorResponse) => { 
                  notifierService.notify("error", "An error occured while loading parameters");
                  return EMPTY 
                }),
              )
            })
          )
        })
      ),
      onUpdateAParameterInstance.pipe(
        switchMap((parameter:Parameter)=>{
          return this.dialog.open(UpdateParameterComponent, {data:parameter}).afterClosed().pipe(
            filter(validation => validation),
            switchMap(()=>{
              return this.parametersService.getParameters().pipe(
                catchError((error:HttpErrorResponse) => { 
                  notifierService.notify("error", "An error occured while loading parameters");
                  return EMPTY 
                }),
              )
            })
          )
        })
      ),
      onUpdateInfo.pipe(
        switchMap((parameter)=>{
          return this.parametersService.updateParameter({info:this.info,parameter_id:parameter.parameter_id}).pipe(
            catchError((error:HttpErrorResponse) => { 
              notifierService.notify("error", "An error occured while updating info");
              return EMPTY 
            }),
            switchMap(()=>{
              return this.parametersService.getParameters().pipe(
                catchError((error:HttpErrorResponse) => { 
                  notifierService.notify("error", "An error occured while loading parameters");
                  return EMPTY 
                }),
              )
            })
          )
        })
      ),
      onDeleteAdministrative.pipe(
        switchMap((adminBoundary:AdminBoundary)=>{
          return this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.parameter.admin_boundary.delete_confirmation_title'),
            confirmationExplanation: this.translate.instant('admin.parameter.admin_boundary.delete_confirmation_explanation')+ adminBoundary.name +' ' +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(confirmation =>confirmation),
            switchMap(()=>{
              return this.parametersService.destroyAdminstrativeBoundary(adminBoundary.admin_boundary_id).pipe(
                catchError((error:HttpErrorResponse) => { 
                  notifierService.notify("error", "An error occured while deleting parameter");
                  return EMPTY 
                }),
                switchMap(()=>{
                  return this.parametersService.getParameters().pipe(
                    catchError((error:HttpErrorResponse) => { 
                      notifierService.notify("error", "An error occured while loading parameters");
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
      shareReplay(1),
      tap((parameter)=>{
        this.info = parameter.info
        this.infoInitial = parameter.info
        this.markDownEditorMode ='preview'
      }),
      switchMap((parameter)=>{
        return this.parametersService.getAppExtent(false).pipe(
          catchError((error:HttpErrorResponse) => { 
            notifierService.notify("error", "An error occured while loading parameters");
            return of(parameter) 
          }),
          map((appExtent)=>{
            return Object.assign(parameter,{appExtent:appExtent})
          })
        )
      })
    )

   }

  ngOnInit(): void {
    this.onInitInstance()
  }

}
