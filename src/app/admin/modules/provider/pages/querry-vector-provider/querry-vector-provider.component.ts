import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, Query } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, merge, EMPTY } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, tap } from 'rxjs/operators';
import { Querry } from '../../../../../type/type';
import { OsmQuerryService } from '../../../../administration/service/osm-querry.service';

/**
 * Fill a provider with a full querry
 */
@Component({
  selector: 'app-querry-vector-provider',
  templateUrl: './querry-vector-provider.component.html',
  styleUrls: ['./querry-vector-provider.component.scss']
})
export class QuerryVectorProviderComponent implements OnInit {


  onInitInstance:()=>void
  /**
   * update an osm querry
   */
  onUpdateInstance:()=>void
  /**
   * add an osm querry
   */
  onAddInstance:()=>void

  @Input()provider_vector_id:number
  /**
   * reload vector provider
   */
  @Output()reloadVectorProvider:EventEmitter<void> = new EventEmitter<void>()

    /**
   * form for the sql querry
   */
  form:FormGroup = this.fb.group({
    sql:new FormControl(undefined,[Validators.required]),
    connection:new FormControl(undefined,[Validators.required]),
  })

  /**
   * Active form (sql) ?
   */
  activeForm:boolean = false

  querry$:Observable<Querry>
  
  connections$:Observable<Array<string>>

  constructor(
    public osmQuerryService:OsmQuerryService,
    public notifierService: NotifierService,
    public fb: FormBuilder,
  ) { 
    const onInit:ReplaySubject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
      onInit.complete()
    }

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = ()=>{
      onUpdate.next()
    }

    this.connections$ = onInit.pipe(
      switchMap(()=>{
        return this.osmQuerryService.listConnections().pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifierService.notify("error", "An error occured while loading the app connections")
            return EMPTY
          }),
        )
      })
    )

    this.querry$ = merge(
      onInit.pipe(shareReplay(1)),
      onAdd.pipe(
        filter(()=>this.form.valid),
        switchMap(()=>{
          this.form.disable()
          return this.osmQuerryService.addQuerry({
            sql:this.form.get('sql').value,
            provider_vector_id:this.provider_vector_id,
            connection:this.form.get('connection').value
          }).pipe(
            tap(()=>{
              this.form.enable()
              this.activeForm = false
              this.reloadVectorProvider.emit()
            }),
            catchError((value:HttpErrorResponse)=>{
              this.form.enable()
              this.notifierService.notify("error", "An error occured while adding the querry")
              try {
                alert(value.error.message)
              } catch (error) {
                
              }
              
              return EMPTY
            }),
          )
        })
      ),
      onUpdate.pipe(
        filter(()=>this.form.valid),
        switchMap(()=>{
          this.form.disable()
          return this.osmQuerryService.updateQuerry({
            sql:this.form.get('sql').value,
            provider_vector_id:this.provider_vector_id,
            connection:this.form.get('connection').value
          }).pipe(
            tap(()=>{
              this.form.enable()
              this.activeForm = false
              this.reloadVectorProvider.emit()
            }),
            catchError((value:HttpErrorResponse)=>{
              this.form.enable()
              this.notifierService.notify("error", "An error occured while adding the querry")
              try {
                alert(value.error.message)
              } catch (error) {
                
              }
              return EMPTY
            }),
          )
        })
      )
    ).pipe(
      shareReplay(1),
      switchMap(()=>{
        return this.osmQuerryService.getQuerry(this.provider_vector_id).pipe(
          catchError((value:HttpErrorResponse)=>{
            if (value.status != 404) {
              this.notifierService.notify("error", "An error occured while loading osm querry")
            }
            return EMPTY
          }),
          tap((querry:Querry)=>{
            this.form.get('sql').setValue(querry.sql)
            this.form.get('connection').setValue(querry.connection)
          })
        )
      })
    )
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

}
