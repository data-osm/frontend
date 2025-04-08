import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { takeUntil, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { BaseMap } from '../../../../../data/models/base-maps';
import { BaseMapsService } from '../../../../../data/services/base-maps.service';

@Component({
  selector: 'app-add-base-map',
  templateUrl: './add-base-map.component.html',
  styleUrls: ['./add-base-map.component.scss']
})
export class AddBaseMapComponent implements OnInit {

  onAddInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  baseMap:BaseMap

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddBaseMapComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public baseMapsService:BaseMapsService
  ) { 
    this.notifier = notifierService;

    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('attribution',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('protocol_carto',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('raster_icon',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('url',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('identifiant',new UntypedFormControl(null))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    onAdd.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid && this.form.get('raster_icon').value.length > 0 ),
      tap(_=> this.form.disable()),
      switchMap(()=>{
        let parameters = toFormData({
          name:this.form.get('name').value,
          attribution:this.form.get('attribution').value,
          url:this.form.get('url').value,
          protocol_carto:this.form.get('protocol_carto').value,
          identifiant:this.form.get('protocol_carto').value=='wms'?this.form.get('identifiant').value:undefined,
          picto:this.form.get('raster_icon').value[0],
          
        })
        return this.baseMapsService.addBaseMap(parameters).pipe(
          catchError( (err)=> { this.notifier.notify("error", "An error occured when adding the base map");this.form.enable();return EMPTY } ),
          tap(_=> this.dialogRef.close(true))
        )
      })
    ).subscribe()

   }

  ngOnInit(): void {
  }

  hasError( field: string, error: string ) {
    const control = this.form.get(field);
    try {
    return control.dirty && control.hasError(error);
      
    } catch (error) {
      return true
    }
  }


  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  close(): void {
    this.dialogRef.close(false);
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