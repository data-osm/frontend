import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { Style } from '../../../../../../../type/type';
import { StyleService } from '../../../../../service/style.service'
import { manageCompHelper } from '../../../../../../../../helper/manage-comp.helper'
import { TranslateService } from '@ngx-translate/core';
import { style } from '@angular/animations';

@Component({
  selector: 'app-list-style',
  templateUrl: './list-style.component.html',
  styleUrls: ['./list-style.component.scss']
})
/**
 * List all style of a provider
 */
export class ListStyleComponent implements OnInit {

  onInitInstance:()=>void
  /**
   * update a style
   */
  onUpdateInstance:(style:Style)=>void
  /**
   * add a style
   */
  onAddInstance:(provider_vector_id:number)=>void

  /**
   * delete a style
   */
  onDeleteInstance:(style:Style)=>void

  /**
   * the vector provider id
   */
  @Input()provider_vector_id:number
  /**
   * list of style of the vector provider
   */
  listStyles:Observable<Array<Style>>

  private readonly notifier: NotifierService;
  
  constructor(
    public StyleService:StyleService,
    notifierService: NotifierService,
    public manageCompHelper:manageCompHelper,
    public translate: TranslateService,
  ) {

    this.notifier = notifierService;

    const onInit:Subject<any> = new ReplaySubject<any>(1)
    this.onInitInstance = ()=>{
      onInit.next()
      onInit.complete()
    }

    const onAdd:Subject<number>=new Subject<number>()
    this.onAddInstance = (provider_vector_id:number)=>{
      onAdd.next(provider_vector_id)
    }

    const onDelete:Subject<Style>= new Subject<Style>()
    this.onDeleteInstance = (style:Style)=>{
      onDelete.next(style)
    }

    const onUpdate:Subject<Style> = new Subject<Style>()
    this.onUpdateInstance = (style:Style)=>{
      onUpdate.next(style)
    }

    this.listStyles = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.StyleService.getAllStylesOfVectorProvider(this.provider_vector_id)
                  .pipe(
                    catchError((value:HttpErrorResponse)=>{
                      if (value.status != 404) {
                        this.notifier.notify("error", "An error occured while loading styles")
                      }
                      return EMPTY
                    })
                  )
        })
      ),
      onAdd.pipe(
        switchMap((provider_vector_id)=>{
          return this.manageCompHelper.openAddStyleDialog([],provider_vector_id)
            .pipe(
              filter(response => response),
              switchMap(()=>{
                return this.StyleService.getAllStylesOfVectorProvider(provider_vector_id)
                  .pipe(
                    catchError((value:HttpErrorResponse)=>{
                      if (value.status != 404) {
                        this.notifier.notify("error", "An error occured while loading styles")
                      }
                      return EMPTY
                    })
                  )
              })
            )
        })
      ),
      onDelete.pipe(
        switchMap((style:Style)=>{
          return  this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.list-style.delete_confirmation_title'),
            confirmationExplanation: this.translate.instant('admin.list-style.delete_confirmation_explanation') + style.name+' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.StyleService.deleteStyle(style.provider_style_id).pipe(
                catchError(() => {
                  this.notifier.notify("error", "An error occured while deleting style");
                  // this.loading = false;
                  return EMPTY;
                }),
                switchMap(()=>{
                  return this.StyleService.getAllStylesOfVectorProvider(this.provider_vector_id)
                  .pipe(
                    catchError((value:HttpErrorResponse)=>{
                      if (value.status != 404) {
                        this.notifier.notify("error", "An error occured while loading styles")
                      }
                      return EMPTY
                    })
                  ) 
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((style:Style)=>{
          return this.manageCompHelper.openUpdateStyleDialog([],style).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.StyleService.getAllStylesOfVectorProvider(this.provider_vector_id)
              .pipe(
                catchError((value:HttpErrorResponse)=>{
                  if (value.status != 404) {
                    this.notifier.notify("error", "An error occured while loading styles")
                  }
                  return EMPTY
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
