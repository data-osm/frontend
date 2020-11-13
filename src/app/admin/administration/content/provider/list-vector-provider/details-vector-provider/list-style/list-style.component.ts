import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Style } from '../../../../../../../type/type';
import { StyleService } from '../../../../../service/style.service'
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
   * update an style
   */
  onUpdateInstance:()=>void
  /**
   * add an style
   */
  onAddInstance:()=>void

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
  ) {

    this.notifier = notifierService;

    const onInit:Subject<any> = new ReplaySubject<any>(1)
    this.onInitInstance = ()=>{
      onInit.next()
      onInit.complete()
    }
    
    this.listStyles = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.StyleService.getAllStylesOfVectorProvider(this.provider_vector_id)
                  .pipe(
                    catchError((value:HttpErrorResponse)=>{
                      if (value.status != 404) {
                        this.notifier.notify("error", "An error occured while loading osm querry")
                      }
                      return EMPTY
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
