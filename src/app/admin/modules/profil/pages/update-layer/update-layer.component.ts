import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { iif, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, map, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';
import { Icon, Layer } from '../../../../../type/type';
import { IconService } from '../../../../administration/service/icon.service';


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
  iconForm:UntypedFormControl = new UntypedFormControl()

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<UpdateLayerComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService: MapsService,
    public iconService:IconService, 
    @Inject(MAT_DIALOG_DATA) public layer: Layer,
  ) {
    this.notifier = notifierService;

    this.presetValues = this.getColorValues()

    this.form.addControl('name', new UntypedFormControl(this.layer.name, [Validators.required]))
    this.form.addControl('layer_id', new UntypedFormControl(this.layer.layer_id, [Validators.required]))
    this.form.addControl('protocol_carto', new UntypedFormControl('wms', [Validators.required]))
    this.form.addControl('icon_color', new UntypedFormControl(this.layer.icon_color, [Validators.required]))
    this.form.addControl('color', new UntypedFormControl(this.layer.color, [Validators.required]))
    this.form.addControl('icon_background', new UntypedFormControl(this.layer.icon_background))
    this.form.addControl('icon', new UntypedFormControl(this.layer.icon, [Validators.required]))
    this.form.addControl('svg_as_text', new UntypedFormControl([Validators.required]))
    this.form.addControl('svg_as_text_square', new UntypedFormControl([Validators.required]))
    this.form.addControl('sub', new UntypedFormControl(this.layer.sub, [Validators.required]))

    this.icon = this.iconService.getIcon(this.layer.icon).pipe(
      mergeMap(icon => 
        iif(() => icon.path.toLowerCase().includes('svg') , 
        of(icon).pipe(
          switchMap((icon)=>{
            return this.iconService.loadSvgContent(icon.path).pipe(
              map((svgContent:string)=>{
                return Object.assign(icon,{svgContent:svgContent})
              }),
              catchError((err) => {this.notifier.notify("error", "An error occured while loading icons"); return EMPTY })
            )
          })
        ), 
        of(icon)
      )),
      tap((value)=>{
        this.iconForm.setValue(value)
      }),
    )

    const onUpdate: Subject<void> = new Subject<void>()
    this.onUpdateInstance = () => {
      onUpdate.next()
    }
    onUpdate.pipe(
      takeUntil(this.destroyed$),
      switchMap(() => {
        return this.mapsService.updateLayer(this.form.value).pipe(
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
