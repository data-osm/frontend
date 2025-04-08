import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';

@Component({
  selector: 'app-add-layer',
  templateUrl: './add-layer.component.html',
  styleUrls: ['./add-layer.component.scss']
})
export class AddLayerComponent implements OnInit, OnDestroy {

  public onAddInstance:()=>void
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
  

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  
  constructor(
    public dialogRef: MatDialogRef<AddLayerComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
    @Inject(MAT_DIALOG_DATA) public sub: number,
  ) { 
    this.notifier = notifierService;
    this.presetValues = this.getColorValues()

    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('protocol_carto',new UntypedFormControl('wms', [Validators.required]))
    this.form.addControl('color',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('icon_color',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('icon',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('icon_background', new UntypedFormControl(true))
    this.form.addControl('svg_as_text',new UntypedFormControl([]))
    this.form.addControl('svg_as_text_square',new UntypedFormControl([]))
    this.form.addControl('sub',new UntypedFormControl(this.sub, [Validators.required]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }
    onAdd.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.mapsService.addLayer(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while adding layer"); return EMPTY }),
          tap(_=>{this.dialogRef.close(true);})
        )
      })
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

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color:string, field:string) {
    this.form.get(field).setValue(color);
  }

}
