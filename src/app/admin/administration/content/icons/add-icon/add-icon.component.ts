import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { requiredFileType } from '../../../../../validators/upload-file-validators';
import {IconService} from '../../../service/icon.service'
import { Observable, fromEvent,merge as observerMerge, forkJoin, concat } from 'rxjs';
import { HttpEvent } from '@angular/common/http';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-add-icon',
  templateUrl: './add-icon.component.html',
  styleUrls: ['./add-icon.component.scss']
})
/**
 * Add icon one or multiple icon
 */
export class AddIconComponent implements OnInit {

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  progress:number = 0

  constructor(
    public dialogRef: MatDialogRef<AddIconComponent>,
    private formBuilder: FormBuilder,
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

    this.form.addControl('category',new FormControl(null, [Validators.required]))
    this.form.addControl('attribution',new FormControl(null))
    this.form.addControl('path',new FormControl(null,[Validators.required]))
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

  formatIconsToSave():Observable<any>[]{
    let listFIle:FileList = this.form.get('path').value
    let listRequest = []
    for (let index = 0; index < listFIle.length; index++) {
      let formIcon = toFormData({
        'path':listFIle[index],
        'name':listFIle[index].name.split('.')[0].toLowerCase(),
        'category':this.form.get('category').value,
        'attribution':this.form.get('attribution').value
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
     forkJoin(...this.formatIconsToSave())
    .pipe(
      switchMap(value=> value),
      catchError( (err)=> { this.notifier.notify("error", "An error occured");throw new Error(err); }),
      finalize(()=>{
        this.form.enable();
        this.progress = 0
      })
    )
    .subscribe(
      (response)=>{
        this.progress = this.progress + 1

        if (this.progress == this.formatIconsToSave().length) {
          this.notifier.notify("success", "Images upload successfully")
          this.dialogRef.close(true);
        }

      }
    )
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