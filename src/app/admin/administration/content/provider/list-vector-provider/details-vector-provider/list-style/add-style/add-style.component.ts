import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { combineLatest, EMPTY, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { StyleService } from '../../../../../../service/style.service'

@Component({
  selector: 'app-add-style',
  templateUrl: './add-style.component.html',
  styleUrls: ['./add-style.component.scss']
})
/**
 * add a new style to vector provider
 */
export class AddStyleComponent implements OnInit, OnDestroy {
  
  /**
   * add the instance, if success, exit dialog 
   */
  onAddInstance:()=>void

  onDestroyInstance:()=>void

  /**
   * is the comp communicating with server ?
   */
  loading:boolean

  private readonly notifier: NotifierService;
  formAddStyle: FormGroup 

  constructor(
    public dialogRef: MatDialogRef<AddStyleComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public StyleService:StyleService,
    @Inject(MAT_DIALOG_DATA) public provider_vector_id: number
  ) { 
    this.notifier = notifierService;

    this.formAddStyle = this.formBuilder.group({
      name: new FormControl(null,[Validators.required]),
      qml_file: new FormControl(null,[Validators.required]),
    })

    const onAdd:Subject<any> = new Subject()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onDestroy:Subject<any> = new Subject()
    this.onDestroyInstance = ()=>{
      onDestroy.next()
      onDestroy.complete()
    }

      onAdd.pipe(
        takeUntil(onDestroy),
        filter(()=>this.formAddStyle.valid ),
        tap(()=>{this.loading=true;this.formAddStyle.disable()}),
        switchMap(()=>{
          let style = toFormData({
            'qml_file':this.formAddStyle.get('qml_file').value[0],
            'name':this.formAddStyle.get('name').value,
            'provider_vector_id':provider_vector_id
          })
          return this.StyleService.addStyle(style)
                .pipe(
                  catchError((value:HttpErrorResponse)=>{
                    this.notifier.notify("error",value.error.msg)
                    this.loading=false;this.formAddStyle.enable()
                    return EMPTY
                  }),
                  tap(()=> {this.loading=false;this.formAddStyle.enable();this.dialogRef.close(true)})
                )
        }),
        tap(()=>{this.loading=false;this.formAddStyle.enable()}),
    ).subscribe()
    
  }

  ngOnInit(): void {

  }

  ngOnDestroy(){
    this.onDestroyInstance()
  }

  close(): void {
    this.dialogRef.close(false);
  }

  /**
   * Is this form control has error ?
   * @param field string
   * @param error string
   * @returns boolean
   */
  hasError( field: string, error: string ):boolean {
    const control = this.formAddStyle.get(field);
    try {
    return control.dirty && control.hasError(error);
      
    } catch (error) {
      return true
    }
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