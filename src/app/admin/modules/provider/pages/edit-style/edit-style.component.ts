import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Style } from '../../../../../type/type';
import { StyleService } from '../../../../administration/service/style.service'

@Component({
  selector: 'app-edit-style',
  templateUrl: './edit-style.component.html',
  styleUrls: ['./edit-style.component.scss']
})
export class EditStyleComponent implements OnInit, OnDestroy {

  /**
   * Edit the style, if success, exit dialog 
   */
  onEditInstance:()=>void

  onDestroyInstance:()=>void

  /**
   * is the comp communicating with server ?
   */
  loading:boolean

  private readonly notifier: NotifierService;

  /**
   * Form to edit a style
   */
  formEditStyle: FormGroup 

  constructor(
    public dialogRef: MatDialogRef<EditStyleComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public StyleService:StyleService,
    @Inject(MAT_DIALOG_DATA) public style: Style
  ) { 
    this.notifier = notifierService;
    this.formEditStyle = this.formBuilder.group({
      name: new FormControl(this.style.name),
      qml_file: new FormControl(null),
    })
 
    const onEdit:Subject<any> = new Subject()
    this.onEditInstance = ()=>{
      onEdit.next()
    }

    const onDestroy:Subject<any> = new Subject()
    this.onDestroyInstance = ()=>{
      onDestroy.next()
      onDestroy.complete()
    }

    onEdit.pipe(
      takeUntil(onDestroy),
      filter(()=>this.formEditStyle.valid ),
      tap(()=>{this.loading=true;this.formEditStyle.disable()}),
      switchMap(()=>{
        let qml_file = this.formEditStyle.get('qml_file').value?.length==1 ? this.formEditStyle.get('qml_file').value[0]:undefined
        let style = toFormData({
          'name':this.formEditStyle.get('name').value,
          'provider_style_id':this.style.provider_style_id
        })
        if (qml_file) {
          style.append('qml_file',qml_file)
        }
        
        return this.StyleService.updateStyle(style).pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifier.notify("error",value.error.msg)
            this.loading=false;this.formEditStyle.enable()
            return EMPTY
          }),
          tap(()=> {this.loading=false;this.formEditStyle.enable();this.dialogRef.close(true)})
        )
      })
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
    const control = this.formEditStyle.get(field);
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