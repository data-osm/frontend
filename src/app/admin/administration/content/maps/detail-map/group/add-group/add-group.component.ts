import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EditMapComponent } from '../../../edit-map/edit-map.component';
import {MapsService} from '../../../../../service/maps.service'
import { ReplaySubject } from 'rxjs';

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
    @Inject(MAT_DIALOG_DATA) public map_id: number,
  ) { 
    this.notifier = notifierService;
    this.presetValues = this.getColorValues();

    this.form.addControl('name',new FormControl(null, [Validators.required]))
    this.form.addControl('color',new FormControl('#fff', [Validators.required]))
    this.form.addControl('icon',new FormControl(null, [Validators.required]))

    this.form.addControl('type_group',new FormControl('thematiques', [Validators.required]))
    this.form.addControl('map',new FormControl(this.map_id, [Validators.required]))
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
