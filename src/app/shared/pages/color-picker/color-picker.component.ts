import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent implements OnInit {

  @Input()colorForm:UntypedFormControl
  @Input()colorLabel:String
  @Input()colorOutputFormat:String='rgba'

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
  
  constructor() {
    this.presetValues = this.getColorValues();
   }

  ngOnInit(): void {
  }

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color:string, field:string) {
    this.colorForm.setValue(color);
  }

}
