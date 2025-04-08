import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Style } from '../../../../../../type/type';
import { StyleService } from '../../../../../administration/service/style.service';

@Component({
  selector: 'app-update-description-style',
  templateUrl: './update-description-style.component.html',
  styleUrls: ['./update-description-style.component.scss']
})
export class UpdateDescriptionStyleComponent implements OnInit {

  /**
   * Edit the style, if success, exit dialog 
   */
   onEditInstance:()=>void
   onDestroyInstance:()=>void

   description:string
   descriptionInitial:string

  loading:boolean=false
  constructor(
    public dialogRef: MatDialogRef<UpdateDescriptionStyleComponent>,
    public notifierService: NotifierService,
    public styleService:StyleService,
    @Inject(MAT_DIALOG_DATA) public style: Style
  ) { 

    this.description = this.style.description
    this.descriptionInitial = this.style.description

    const onEdit:Subject<void> = new Subject()
    this.onEditInstance = ()=>{
      onEdit.next()
    }
    const onDestroy:Subject<void> = new Subject()
    this.onDestroyInstance = ()=>{
      onDestroy.next()
      onDestroy.complete()
    }

    onEdit.pipe(
      takeUntil(onDestroy),
      tap(()=>{this.loading=true;}),
      switchMap(()=>{
        let style = toFormData({
          'description':this.description,
          'provider_style_id':this.style.provider_style_id
        })

        return this.styleService.updateStyle(style).pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifierService.notify("error",value.error.msg)
            this.loading=false
            return EMPTY
          }),
          tap(()=> {this.loading=false;this.dialogRef.close(true)})
        )
      })

    ).subscribe()

  }

  ngOnInit(): void {
  }
  close(): void {
    this.dialogRef.close(false);
  }
  ngOnDestroy(){
    this.onDestroyInstance()
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