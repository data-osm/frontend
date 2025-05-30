import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { switchMap, catchError, tap, takeUntil, filter } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';
import { SubGroup } from '../../../../../type/type';

@Component({
  selector: 'app-edit-sub-group',
  templateUrl: './edit-sub-group.component.html',
  styleUrls: ['./edit-sub-group.component.scss']
})
/**
 * Edit a sub group
 */
export class EditSubGroupComponent implements OnInit {

  public onUpdateInstance: () => void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<EditSubGroupComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService: MapsService,
    @Inject(MAT_DIALOG_DATA) public subGroup: SubGroup,
  ) {
    this.notifier = notifierService;

    this.form.addControl('name', new UntypedFormControl(this.subGroup.name, [Validators.required]))
    this.form.addControl('group_sub_id', new UntypedFormControl(this.subGroup.group_sub_id, [Validators.required]))
    this.form.addControl('group', new UntypedFormControl(this.subGroup.group, [Validators.required]))

    const onUpdate: Subject<void> = new Subject<void>()
    this.onUpdateInstance = () => {
      onUpdate.next()
    }

    onUpdate.pipe(
      filter(() => this.form.valid),
      switchMap(() => {
        return this.mapsService.updateSubGroup(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while updating sub group"); return EMPTY }),
          tap(_ => {
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
