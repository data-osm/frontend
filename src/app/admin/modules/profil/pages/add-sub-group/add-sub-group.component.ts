import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';

@Component({
  selector: 'app-add-sub-group',
  templateUrl: './add-sub-group.component.html',
  styleUrls: ['./add-sub-group.component.scss']
})
/**
 * Add sub group
 */
export class AddSubGroupComponent implements OnInit, OnDestroy {

  public onAddInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  
  constructor(
    public dialogRef: MatDialogRef<AddSubGroupComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
    @Inject(MAT_DIALOG_DATA) public group_id: number,
  ) { 
    this.notifier = notifierService;

    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('group',new UntypedFormControl(this.group_id, [Validators.required]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    onAdd.pipe(
      filter(()=> this.form.valid),
      switchMap(()=>{
        return this.mapsService.addSubGroup(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while adding sub group"); return EMPTY }),
          tap(_=>{
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

}
