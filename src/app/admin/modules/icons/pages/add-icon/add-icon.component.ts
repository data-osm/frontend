import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { requiredFileType } from '../../../../../validators/upload-file-validators';
import {IconService} from '../../../../administration/service/icon.service'
import { Observable, fromEvent,merge as observerMerge, forkJoin, concat, EMPTY } from 'rxjs';
import { HttpEvent } from '@angular/common/http';
import { catchError, concatAll, concatMap, finalize, map, mergeMap, switchMap, take, tap, toArray } from 'rxjs/operators';
import { Icon } from '../../../../../type/type';

@Component({
  selector: 'app-add-icon',
  templateUrl: './add-icon.component.html',
  styleUrls: ['./add-icon.component.scss']
})
/**
 * Add icon one or multiple icon
 */
export class AddIconComponent implements OnInit {

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  progress:number = 0

  constructor(
    public dialogRef: MatDialogRef<AddIconComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public IconService:IconService
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {

    this.initialiseForm()
    
  }

  close(): void {
    this.dialogRef.close(false);
  }


  /**
   * initalise the form
   */
  initialiseForm() {

    // this.form.addControl('category',new FormControl(null, [Validators.required]))
    this.form.addControl('attribution',new UntypedFormControl(null))
    this.form.addControl('tags',new UntypedFormControl([]))
    this.form.addControl('path',new UntypedFormControl(null,[Validators.required]))
    // this.form.addControl('path',new FormControl(null,[Validators.required, requiredFileType('svg')]))
  }

  hasError( field: string, error: string ) {
    const control = this.form.get(field);
    try {
    return control.dirty && control.hasError(error);
      
    } catch (error) {
      return true
    }
  }

  formatIconsToSave():Observable<Icon>[]{
    let listFIle:FileList = this.form.get('path').value

    let listRequest:Array<Observable<Icon>> = []
    for (let index = 0; index < listFIle.length; index++) {
      let formIcon = toFormData({
        'path':listFIle[index],
        'name':listFIle[index].name.split('.')[0].toLowerCase(),
        // 'category':this.form.get('category').value,
        'attribution':this.form.get('attribution').value,
        'tags':JSON.stringify(this.form.get('tags').value)
      })
      listRequest.push(this.IconService.uploadIcon(formIcon))
    }
    return listRequest
  }

  /**
   * Save icons
   */
   saveIcon(){
    this.form.disable()
    concat(this.formatIconsToSave())
    .pipe(
      concatAll(),
      toArray(),
      catchError( (err)=> { this.form.enable();this.notifier.notify("error", "An error occured when saving icons");return EMPTY }),
      tap((value)=>{
        this.form.enable();
        this.notifier.notify("success", "Images upload successfully")
        this.dialogRef.close(value.filter(v => v!= undefined));
      }),
      take(1)
    )
    .subscribe( )
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