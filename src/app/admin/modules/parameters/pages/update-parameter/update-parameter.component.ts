import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { takeUntil, switchMap, tap, catchError } from 'rxjs/operators';
import { AppExtent, Parameter } from '../../../../../data/models/parameters';
import { ParametersService } from '../../../../../data/services/parameters.service';

@Component({
  selector: 'app-update-parameter',
  templateUrl: './update-parameter.component.html',
  styleUrls: ['./update-parameter.component.scss']
})
export class UpdateParameterComponent implements OnInit {
  onInitInstance:()=>void
  onAddInstance:()=>void
  onUpdateInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  appExtents$:Observable<Array<AppExtent>>

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<UpdateParameterComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public parametersService:ParametersService,
    @Inject(MAT_DIALOG_DATA) public parameter: Parameter,
  ) { 
    this.notifier = notifierService;
    
    this.form.addControl('map',new FormControl(null, [Validators.required]))
    this.form.addControl('extent',new FormControl(null, [Validators.required]))
    this.form.addControl('extent_pk',new FormControl(null))

    if (this.parameter && this.parameter.map) {
      this.form.get('map').setValue(this.parameter.map)
    }

    if (this.parameter && this.parameter.extent) {
      this.form.get('extent').setValue(this.parameter.extent)
    }

    if (this.parameter && this.parameter.extent_pk) {
      this.form.get('extent_pk').setValue(this.parameter.extent_pk)
    }

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () =>{
      onInit.next();
    }

    this.appExtents$ = onInit.pipe(
      switchMap(()=>{
        return this.parametersService.getListAppExtent().pipe(
          catchError((error:HttpErrorResponse) => { 
            if (error.status != 404) {
              this.notifier.notify("error", "An error occured while listing app extents");
            }
            return EMPTY 
          }),
        )
      })
    )

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = () =>{
      onUpdate.next();
    }
    
    onAdd.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.parametersService.addParameter({
          map:this.form.get('map').value.map_id,
          extent: this.form.get('extent').value.provider_vector_id
        }).pipe(
          tap(()=>{this.dialogRef.close(true)}),
          catchError((error:HttpErrorResponse) => { 
            this.notifier.notify("error", "An error occured while updating parameter");
            return EMPTY 
          }),
        )
      })
    ).subscribe()

    onUpdate.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.parametersService.updateParameter({
          map:this.form.get('map').value.map_id,
          extent: this.form.get('extent').value.provider_vector_id,
          extent_pk: this.form.get('extent_pk').value,
          parameter_id:this.parameter.parameter_id
        }).pipe(
          tap(()=>{this.dialogRef.close(true)}),
          catchError((error:HttpErrorResponse) => { 
            this.notifier.notify("error", "An error occured while updating parameter");
            return EMPTY 
          }),
        )
      })
    ).subscribe()

  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  close(){
    this.dialogRef.close(false)
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}

