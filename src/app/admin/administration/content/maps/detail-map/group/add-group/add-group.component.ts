import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators,ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EditMapComponent } from '../../../edit-map/edit-map.component';
import {MapsService} from '../../../../../service/maps.service'
import {IconService} from '../../../../../service/icon.service'
import { combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { IconsComponent } from '../../../../icons/icons.component';
import { catchError, filter, map, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { Icon } from '../../../../../../../type/type';
import { Svg, SVG } from '@svgdotjs/svg.js'
import { environment } from '../../../../../../../../environments/environment';

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
  

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  
  constructor(
    public dialogRef: MatDialogRef<EditMapComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService,
    public IconService:IconService,
    @Inject(MAT_DIALOG_DATA) public map_id: number,
  ) { 
    this.notifier = notifierService;
    this.presetValues = this.getColorValues();

    this.form.addControl('name',new FormControl(null, [Validators.required]))
    this.form.addControl('color',new FormControl("#02aca7", [Validators.required]))
    this.form.addControl('icon_id',new FormControl(null))
    this.form.addControl('svg_as_text',new FormControl(null))
    this.form.addControl('icon_path',new FormControl(null))
    
    this.form.addControl('type_group',new FormControl('thematiques', [Validators.required]))
    this.form.addControl('map_id',new FormControl(this.map_id, [Validators.required]))

    this.form.setValidators(atLeastOne(Validators.required, ['icon_path','svg_as_text']))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }
    onAdd.pipe(
      takeUntil(this.destroyed$),
      switchMap(()=>{
        return this.MapsService.addGroup(this.form.value).pipe(
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
  group: FormGroup,
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