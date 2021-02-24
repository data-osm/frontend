import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { ReplaySubject, Subject, EMPTY } from 'rxjs';
import { filter, tap, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { toFormData } from '../../../../../../icons/add-icon/add-icon.component';
import { AddStyleComponent } from '../add-style.component';
import { StyleService } from '../../../../../../../service/style.service'

@Component({
  selector: 'app-cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.scss']
})
export class ClusterComponent implements OnInit {

  
  @Input() styleName: AbstractControl
  @Input() provider_vector_id: number


  public onAddInstance: () => void

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  form: FormGroup
  loading: boolean = false
  public colorList = [
    { key: 'red', value: '#FF3A33' },
    { key: 'terracotta', value: '#E68673' },
    { key: 'orange', value: '#FF7733' },
    { key: 'amber', value: '#FFAA00' },
    { key: 'khaki', value: '#B3A17D' },
    { key: 'yellow', value: '#FFD11A' },
    { key: 'lime', value: '#BCD92B' },
    { key: 'grass', value: '#7ACC29' },
    { key: 'green', value: '#00CC66' },
    { key: 'moviikgreen', value: '#17E68F' },
    { key: 'jade', value: '#4D997D' },
    { key: 'teal', value: '#73DFE6' },
    { key: 'skyblue', value: '#4DC3FF' },
    { key: 'blue', value: '#0095FF' },
    { key: 'royalblue', value: '#0055FF' },
    { key: 'ultraviolet', value: '#6200EE' },
    { key: 'violet', value: '#8126FF' },
    { key: 'deeppurple', value: '#AA33FF' },
    { key: 'pink', value: '#FF99CC' },
    { key: 'strawberry', value: '#FD5B82' }
  ];
  public presetValues: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddStyleComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public StyleService: StyleService,
  ) {
    this.notifier = notifierService;

    this.form = this.formBuilder.group({
      name: new FormControl(null, [Validators.required]),
      color: new FormControl(null, [Validators.required]),
      svg_as_text: new FormControl(null, [Validators.required]),
      type: new FormControl('cluster',[Validators.required]),
      provider_vector_id: new FormControl(null, [Validators.required]),
    })

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next()
    }

    onAdd.pipe(
      filter(() => this.form.valid),
      tap(() => { this.form.disable() }),
      switchMap(() => {
        let style = {
          'color': this.form.get('color').value,
          'name': this.form.get('name').value,
          'provider_vector_id': this.form.get('provider_vector_id').value,
          'type': this.form.get('type').value,
          'svg_as_text': this.form.get('svg_as_text').value,
        }
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

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color:string, field:string) {
    this.form.get(field).setValue(color);
  }

}
