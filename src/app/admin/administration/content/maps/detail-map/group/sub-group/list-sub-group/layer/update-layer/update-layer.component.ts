import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Icon, Layer } from '../../../../../../../../../../type/type';
import { MapsService } from '../../../../../../../../service/maps.service'
import { IconService } from '../../../../../../../../service/icon.service'

@Component({
  selector: 'app-update-layer',
  templateUrl: './update-layer.component.html',
  styleUrls: ['./update-layer.component.scss']
})
export class UpdateLayerComponent implements OnInit {

  public onUpdateInstance: () => void
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

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  icon:Observable<Icon>

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<UpdateLayerComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService: MapsService,
    public IconService:IconService, 
    @Inject(MAT_DIALOG_DATA) public layer: Layer,
  ) {
    this.notifier = notifierService;

    this.presetValues = this.getColorValues()

    this.form.addControl('name', new FormControl(this.layer.name, [Validators.required]))
    this.form.addControl('layer_id', new FormControl(this.layer.layer_id, [Validators.required]))
    this.form.addControl('protocol_carto', new FormControl('wms', [Validators.required]))
    this.form.addControl('color', new FormControl(this.layer.color, [Validators.required]))
    this.form.addControl('icon', new FormControl(this.layer.icon, [Validators.required]))
    this.form.addControl('svg_as_text', new FormControl([Validators.required]))
    this.form.addControl('svg_as_text_square', new FormControl([Validators.required]))
    this.form.addControl('sub', new FormControl(this.layer.sub, [Validators.required]))

    this.icon = this.IconService.getIcon(this.layer.icon).pipe(
      switchMap((icon)=>{
        return this.IconService.loadSvgContent(icon.path).pipe(
          map((svgContent:string)=>{
            return Object.assign(icon,{svgContent:svgContent})
          }),
          catchError((err) => {this.notifier.notify("error", "An error occured while loading icons"); return EMPTY })
        )
      })
    )

    const onUpdate: Subject<void> = new Subject<void>()
    this.onUpdateInstance = () => {
      onUpdate.next()
    }
    onUpdate.pipe(
      takeUntil(this.destroyed$),
      switchMap(() => {
        return this.MapsService.updateLayer(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while updating layer"); return EMPTY }),
          tap(_ => { this.dialogRef.close(true); })
        )
      })
    ).subscribe()
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  close(): void {
    this.dialogRef.close(false);
  }

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color: string, field: string) {
    this.form.get(field).setValue(color);
  }

}
