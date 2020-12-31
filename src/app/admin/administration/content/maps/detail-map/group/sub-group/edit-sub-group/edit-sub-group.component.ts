import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { switchMap, catchError, tap, takeUntil, filter } from 'rxjs/operators';
import { SubGroup } from '../../../../../../../../type/type';
import { MapsService } from '../../../../../../service/maps.service'

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


  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<EditSubGroupComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService: MapsService,
    @Inject(MAT_DIALOG_DATA) public subGroup: SubGroup,
  ) {
    this.notifier = notifierService;

    this.form.addControl('name', new FormControl(this.subGroup.name, [Validators.required]))
    this.form.addControl('group_sub_id', new FormControl(this.subGroup.group_sub_id, [Validators.required]))
    this.form.addControl('group', new FormControl(this.subGroup.group, [Validators.required]))

    const onUpdate: Subject<void> = new Subject<void>()
    this.onUpdateInstance = () => {
      onUpdate.next()
    }

    onUpdate.pipe(
      filter(() => this.form.valid),
      switchMap(() => {
        return this.MapsService.updateSubGroup(this.form.value).pipe(
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
