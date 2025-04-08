import { Component, Inject, inject, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { takeUntil, filter, tap, switchMap, catchError } from 'rxjs/operators';
import { BaseMap } from '../../../../../data/models/base-maps';
import { BaseMapsService } from '../../../../../data/services/base-maps.service';

@Component({
  selector: 'app-update-base-map',
  templateUrl: './update-base-map.component.html',
  styleUrls: ['./update-base-map.component.scss']
})
export class UpdateBaseMapComponent implements OnInit {

  onUpdateInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<UpdateBaseMapComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public baseMapsService:BaseMapsService,
    @Inject(MAT_DIALOG_DATA) public baseMap:BaseMap
  ) { 
    this.notifier = notifierService;

    this.form.addControl('id',new UntypedFormControl(this.baseMap.id, [Validators.required]))
    this.form.addControl('name',new UntypedFormControl(this.baseMap.name, [Validators.required]))
    this.form.addControl('attribution',new UntypedFormControl(this.baseMap.attribution, [Validators.required]))
    this.form.addControl('protocol_carto',new UntypedFormControl(this.baseMap.protocol_carto, [Validators.required]))
    this.form.addControl('raster_icon',new UntypedFormControl(null))
    this.form.addControl('url',new UntypedFormControl(this.baseMap.url, [Validators.required]))
    this.form.addControl('identifiant',new UntypedFormControl(this.baseMap.identifiant))

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = () =>{
      onUpdate.next();
    }

    onUpdate.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid ),
      tap(_=> this.form.disable()),
      switchMap(()=>{

        let parameters = toFormData({
          id:this.form.get('id').value,
          name:this.form.get('name').value,
          attribution:this.form.get('attribution').value,
          url:this.form.get('url').value,
          protocol_carto:this.form.get('protocol_carto').value,
          identifiant:this.form.get('protocol_carto').value=='wms'?this.form.get('identifiant').value:undefined,
        })

        if (this.form.get('raster_icon').value && this.form.get('raster_icon').value.length > 0 ) {
          parameters.set('picto', this.form.get('raster_icon').value[0])
        }

        return this.baseMapsService.updateBaseMap(parameters).pipe(
          catchError( (err)=> { this.notifier.notify("error", "An error occured when updating the base map");this.form.enable();return EMPTY } ),
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
