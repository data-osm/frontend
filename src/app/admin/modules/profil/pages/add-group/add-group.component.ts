import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators,ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { Icon } from '../../../../../type/type';
import { MapsService } from '../../../../../data/services/maps.service';

export interface IconWithSVGContent extends Icon{
  svgContent:string
}
@Component({
  selector: 'app-add-group',
  templateUrl: './add-group.component.html',
  styleUrls: ['./add-group.component.scss']
})
export class AddGroupComponent implements OnInit, OnDestroy {

  onAddInstance:()=>void

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
    public dialogRef: MatDialogRef<AddGroupComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
    @Inject(MAT_DIALOG_DATA) public map_id: number,
  ) { 
    this.notifier = notifierService;
    this.presetValues = this.getColorValues();

    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('color',new UntypedFormControl("#02aca7", [Validators.required]))
    this.form.addControl('icon_id',new UntypedFormControl(null))
    this.form.addControl('svg_as_text',new UntypedFormControl(null))
    
    this.form.addControl('type_group',new UntypedFormControl('thematiques', [Validators.required]))
    this.form.addControl('map_id',new UntypedFormControl(this.map_id, [Validators.required]))


    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }
    onAdd.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.mapsService.addGroup(this.form.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while adding group"); return EMPTY }),
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
export const atLeastOne = (validator: ValidatorFn, controls:string[] = null) => (
  group: UntypedFormGroup,
): ValidationErrors | null => {
  if(!controls){
    controls = Object.keys(group.controls)
  }

  const hasAtLeastOne = group && group.controls && controls
    .some(k => !validator(group.controls[k]));

  return hasAtLeastOne ? null : {
    atLeastOne: true,
  };
};