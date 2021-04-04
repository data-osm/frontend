import { Component, Inject, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { AddStyleComponent } from '../add-style/add-style.component';
import { StyleService } from '../../../../administration/service/style.service'
import { SimpleChanges } from '@angular/core';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-qml',
  templateUrl: './qml.component.html',
  styleUrls: ['./qml.component.scss']
})
export class QmlComponent implements OnInit, OnChanges, OnDestroy {

  @Input() styleName: AbstractControl
  @Input() provider_vector_id: number


  public onAddInstance: () => void

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  form: FormGroup
  loading: boolean = false

  constructor(
    public dialogRef: MatDialogRef<AddStyleComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public StyleService: StyleService,
  ) {
    this.notifier = notifierService;

    this.form = this.formBuilder.group({
      name: new FormControl(null, [Validators.required]),
      provider_vector_id: new FormControl(null, [Validators.required]),
      qml_file: new FormControl(null, [Validators.required]),
    })

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next()
    }

    onAdd.pipe(
      filter(() => this.form.valid),
      tap(() => { this.form.disable() }),
      switchMap(() => {
        let style = toFormData({
          'qml_file': this.form.get('qml_file').value[0],
          'name': this.form.get('name').value,
          'provider_vector_id': this.form.get('provider_vector_id').value
        })
        return this.StyleService.addStyle(style)
          .pipe(
            catchError((value: HttpErrorResponse) => {
              this.notifier.notify("error", value.error.msg)
              this.loading = false; this.form.enable()
              return EMPTY
            }),
            tap(() => { this.loading = false; this.form.enable(); this.dialogRef.close(true) })
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

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    if (changes.styleName) {
      this.styleName.valueChanges.pipe(
        tap((value:string)=>{
          this.form.get('name').setValue(value)
        }),
        takeUntil(this.destroyed$)
      ).subscribe()
    }

    if (changes.provider_vector_id) {
      this.form.get('provider_vector_id').setValue(changes.provider_vector_id.currentValue)
    }

  }

  /**
  * Is this form control has error ?
  * @param field string
  * @param error string
  * @returns boolean
  */
  hasError(field: string, error: string): boolean {
    const control = this.form.get(field);
    try {
      return control.dirty && control.hasError(error);

    } catch (error) {
      return true
    }
  }

}

export function toFormData<T>(formValue: T) {
  const formData = new FormData();

  for (const key of Object.keys(formValue)) {
    const value = formValue[key];
    formData.append(key, value);
  }

  return formData;
}