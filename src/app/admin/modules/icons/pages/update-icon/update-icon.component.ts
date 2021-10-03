import { Component, Inject, OnInit } from '@angular/core';
import { inject } from '@angular/core/testing';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Icon } from '../../../../../type/type';
import {IconService} from '../../../../administration/service/icon.service'

@Component({
  selector: 'app-update-icon',
  templateUrl: './update-icon.component.html',
  styleUrls: ['./update-icon.component.scss']
})
export class UpdateIconComponent implements OnInit {
  onUpdateInstance:()=>void
  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  progress:number = 0
  url_prefix = environment.backend
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  constructor(
    public dialogRef: MatDialogRef<UpdateIconComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public IconService:IconService,
    @Inject(MAT_DIALOG_DATA) public icon: Icon,

  ) { 
    this.notifier = notifierService;
    this.form.addControl('category',new FormControl(this.icon.category, [Validators.required]))
    this.form.addControl('attribution',new FormControl(this.icon.attribution))
    this.form.addControl('icon_id',new FormControl(this.icon.icon_id))
    this.form.addControl('tags',new FormControl( this.icon.tags.map(tag => tag.name) ))
    // this.form.addControl('path',new FormControl(null,[Validators.required]))

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = ()=>{
      onUpdate.next()
    }

    onUpdate.pipe(
      switchMap(()=>{
        let formIcon = toFormData({
          'category':this.form.get('category').value,
          'attribution':this.form.get('attribution').value,
          'icon_id':this.form.get('icon_id').value,
          'tags':JSON.stringify(this.form.get('tags').value)
        })

        return this.IconService.updateIcon(formIcon).pipe(
          catchError( (err)=> { this.notifier.notify("error", "An error occured when updating icons"); return EMPTY }),
          tap(()=>{
            this.dialogRef.close(true)
          })

        )
      }),
      takeUntil(this.destroyed$)
    ).subscribe()
  }

  ngOnInit(): void {

    
  }
  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
  close(): void {
    this.dialogRef.close(false);
  }


  hasError( field: string, error: string ) {
    const control = this.form.get(field);
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