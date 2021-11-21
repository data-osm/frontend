import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { ReplaySubject, Subject, EMPTY } from 'rxjs';
import { filter, tap, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { toFormData } from '../../../icons/pages/add-icon/add-icon.component';
import { AddStyleComponent } from '../add-style/add-style.component';
import { StyleService } from '../../../../administration/service/style.service'
import { CustomStyle, Icon, Style } from '../../../../../type/type';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.scss']
})
export class ClusterComponent implements OnInit {

  
  @Input() styleName: AbstractControl
  @Input() provider_vector_id: number
  @Input() customStyle:CustomStyle
  @Input() color: string
  @Input() icon_color: string 
  @Input() icon: Icon 
  @Input() icon_background: boolean 

  public onAddInstance: () => void

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  environment = environment
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
    public dialogRef: MatDialogRef<AddStyleComponent, Style>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public StyleService: StyleService,
  ) {
    this.notifier = notifierService;

    this.presetValues = this.getColorValues()
    this.form = this.formBuilder.group({
      name: this.styleName,
      icon: new FormControl(this.icon, [Validators.required]),
      color: new FormControl(this.color, [Validators.required]),
      icon_color: new FormControl(this.icon_color, []),
      svg_as_text: new FormControl(null, [Validators.required]),
      type: new FormControl('cluster',[Validators.required]),
      icon_background: new FormControl(this.icon_background != undefined?this.icon_background:false,[]),
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
          'name': this.styleName.value,
          'icon': this.form.get('icon').value.icon_id,
          'provider_vector_id': this.provider_vector_id,
          'custom_style_id': this.customStyle.custom_style_id,
          'svg_as_text': this.form.get('svg_as_text').value,
        }
        return this.StyleService.addStyle(style)
          .pipe(
            catchError((value: HttpErrorResponse) => {
              this.notifier.notify("error", value.error.msg)
              this.loading = false; this.form.enable()
              return EMPTY
            }),
            tap((res) => { this.loading = false; this.form.enable(); this.dialogRef.close(res) })
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

  ngOnChanges(changes:SimpleChanges){

    if (changes.icon && this.icon) {
      this.form.get('icon').setValue(this.icon)
      this.form.get('color').setValue(this.color)
      this.form.get('icon_color').setValue(this.icon_color)
      this.form.get('icon_background').setValue(this.icon_background != undefined?this.icon_background:false)
    }
  }

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color:string, field:string) {
    this.form.get(field).setValue(color);
  }

}
