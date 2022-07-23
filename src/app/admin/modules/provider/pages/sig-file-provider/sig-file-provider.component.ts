import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, Query } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, merge, EMPTY } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, tap } from 'rxjs/operators';
import { SigFile } from '../../../../../type/type';
import { OsmQuerryService } from '../../../../administration/service/osm-querry.service';
import { SigFileService } from '../../../../administration/service/sig-file.service';

/**
 * Fill a provider with an SIG FILE
 */
@Component({
  selector: 'app-sig-file-provider',
  templateUrl: './sig-file-provider.component.html',
  styleUrls: ['./sig-file-provider.component.scss']
})
export class SigFileProviderComponent implements OnInit {

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
   * form for the SIG file
   */
  form:FormGroup = this.fb.group({
    file:new FormControl(undefined,[Validators.required]),
    connection:new FormControl(undefined,[]),
  })

  connections$:Observable<Array<string>>

  sigFile$:Observable<SigFile>

  activeForm:boolean = true

  constructor(
    public sigFileService:SigFileService,
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

    this.sigFile$ = merge(
      onInit.pipe(shareReplay(1)),
      onAdd.pipe(
        filter(()=>this.form.valid),
        switchMap(()=>{
          this.form.disable()
          return this.sigFileService.addSigFile(toFormData({
              provider_vector_id:this.provider_vector_id,
              // connection:this.form.get('connection').value,
              file:this.form.get('file').value[0],
            })).pipe(
              tap(()=>{
                this.form.enable()
                this.activeForm = false
                this.reloadVectorProvider.emit()
              }),
              catchError((value:HttpErrorResponse)=>{
                this.form.enable()
                this.notifierService.notify("error", "An error occured while adding the sig file")
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
          return this.sigFileService.updateSigFile(toFormData({
              provider_vector_id:this.provider_vector_id,
              // connection:this.form.get('connection').value,
              file:this.form.get('file').value[0],
            })).pipe(
              tap(()=>{
                this.form.enable()
                this.activeForm = false
                this.reloadVectorProvider.emit()
              }),
              catchError((value:HttpErrorResponse)=>{
                this.form.enable()
                this.notifierService.notify("error", "An error occured while updating the sig file")
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
        return this.sigFileService.getSigFile(this.provider_vector_id).pipe(
          catchError((value:HttpErrorResponse)=>{
            if (value.status != 404) {
              this.notifierService.notify("error", "An error occured while loading the SIG FILE")
            }
            return EMPTY
          }),
          tap((sigFile:SigFile)=>{
            this.activeForm = false
            this.form.get('connection').setValue(sigFile.connection)
          })
        )
      })
    )

   }

  ngOnInit(): void {
    this.onInitInstance()
  }

}
export function toFormData<T>( formValue: T ) {
  const formData = new FormData();

  for ( const key of Object.keys(formValue) ) {
    const value = formValue[key];
    formData.append(key, value);
  }

  return formData;
}