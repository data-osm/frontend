import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { filter, Observable, ReplaySubject, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ParametersService } from '../../../data/services/parameters.service';

@Component({
  selector: 'app-request-feedback',
  templateUrl: './request-feedback.component.html',
  styleUrls: ['./request-feedback.component.scss']
})
export class RequestFeedbackComponent {

  submitFeedback: () => void
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  notes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  feedbackForm: UntypedFormGroup = this.formBuilder.group({
    "notes": new UntypedFormControl(null, [Validators.required])
  })

  constructor(
    public dialogRef: MatDialogRef<RequestFeedbackComponent>,
    private formBuilder: UntypedFormBuilder,
    private parameterService: ParametersService
  ) {
    const onSubmitFeedback: Subject<void> = new Subject<void>()

    this.submitFeedback = () => {
      onSubmitFeedback.next()
    }

    onSubmitFeedback.pipe(
      takeUntil(this.destroyed$),
      filter(() => this.feedbackForm.valid),
      switchMap(() => {
        return this.parameterService.createNPSFeedback(this.feedbackForm.value.notes)
      }),
      tap(() => {
        this.dialogRef.close()
      }),
    ).subscribe()
  }

  closeModal(): void {
    this.parameterService.createNPSFeedback(null).subscribe()
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }


}


