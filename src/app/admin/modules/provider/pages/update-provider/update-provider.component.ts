import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { VectorProvider } from '../../../../../type/type';
import {VectorProviderService} from '../../../../administration/service/vector-provider.service'

@Component({
  selector: 'app-update-provider',
  templateUrl: './update-provider.component.html',
  styleUrls: ['./update-provider.component.scss']
})
export class UpdateProviderComponent implements OnInit {
  onUpdateInstance:()=>void
  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  constructor(
    public dialogRef: MatDialogRef<UpdateProviderComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public VectorProviderService:VectorProviderService,
    @Inject(MAT_DIALOG_DATA) public provider: VectorProvider,

  ) { 
    this.notifier = notifierService;
    this.form.addControl( 'provider_vector_id', new UntypedFormControl(provider.provider_vector_id,[Validators.required]) )
    this.form.addControl( 'name', new UntypedFormControl(provider.name,[Validators.required]) )
    const onUpdate:Subject<void> = new Subject<void>()

    this.onUpdateInstance = ()=>{
      onUpdate.next()
    }

    onUpdate.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.VectorProviderService.updateVectorProvider(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while updating provider"); return EMPTY }),
          tap(_=>{this.dialogRef.close(true);})
        )
      })
    ).subscribe()
  }

  ngOnInit(): void {
  }

  close(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
