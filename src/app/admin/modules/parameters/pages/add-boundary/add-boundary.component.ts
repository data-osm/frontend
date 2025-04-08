import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ParametersService } from '../../../../../data/services/parameters.service';

@Component({
  selector: 'app-add-boundary',
  templateUrl: './add-boundary.component.html',
  styleUrls: ['./add-boundary.component.scss']
})
export class AddBoundaryComponent implements OnInit {

  onAddInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  // baseMap:BaseMap

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddBoundaryComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public parametersService:ParametersService
  ) { 
    this.notifier = notifierService;

    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('vector',new UntypedFormControl(null, [Validators.required]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }
    onAdd.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.parametersService.addAdminstrativeBoundary({
          name:this.form.get('name').value.toString(),
          vector: this.form.get('vector').value.provider_vector_id
        }).pipe(
          tap(()=>{this.dialogRef.close(true)}),
          catchError((error:HttpErrorResponse) => { 
            this.notifier.notify("error", "An error occured while adding administrative boundary ");
            return EMPTY 
          }),
        )
      })
    ).subscribe()
  }

  ngOnInit(): void {
  }

  close(){
    this.dialogRef.close(false)
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
