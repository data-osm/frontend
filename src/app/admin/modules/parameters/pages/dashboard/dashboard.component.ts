import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { AdminBoundary, Parameter } from '../../../../../data/models/parameters';
import { ParametersService } from '../../../../../data/services/parameters.service';
import { AddBoundaryComponent } from '../add-boundary/add-boundary.component';
import { manageCompHelper } from '../../../../../../helper/manage-comp.helper'

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
  
  parameter$:Observable<Parameter>
  private readonly notifier: NotifierService;

  displayedColumnsAdminBoundary:Array<string> = ['name','source','action']

  constructor(
    public parametersService:ParametersService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog: MatDialog,
    public manageCompHelper : manageCompHelper,
  ) {
    this.notifier = notifierService;

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onDeleteAdministrative:Subject<AdminBoundary> = new Subject<AdminBoundary>()
    this.onDeleteAdministrativeBoundaryInstance = (adminBoundary:AdminBoundary)=>{
      onDeleteAdministrative.next(adminBoundary)
    }

    const onAddAdministrativeBoundary:Subject<AdminBoundary> = new Subject<AdminBoundary>()
    this.onAddAdministrativeBoundaryInstance = ()=>{
      onAddAdministrativeBoundary.next()
    }

    this.parameter$ = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.parametersService.getParameters().pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while loading parameters");
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
                  this.notifier.notify("error", "An error occured while loading parameters");
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
                  this.notifier.notify("error", "An error occured while deleting parameter");
                  return EMPTY 
                }),
                switchMap(()=>{
                  return this.parametersService.getParameters().pipe(
                    catchError((error:HttpErrorResponse) => { 
                      this.notifier.notify("error", "An error occured while loading parameters");
                      return EMPTY 
                    }),
                  )
                })
              )
            })
          )
        })
      )
    )

   }

  ngOnInit(): void {
    this.onInitInstance()
  }

}
