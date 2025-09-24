import { Component, Input, SimpleChanges } from '@angular/core';
import {
  Map,
} from "../../../../giro-3d-module"
import { SunSystem } from '../../../../processing/sunSystem';
import { UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-scene-settings',
  templateUrl: './scene-settings.component.html',
  styleUrls: ['./scene-settings.component.scss']
})
export class SceneSettingsComponent {
  @Input() map: Map
  @Input() sunSystem: SunSystem

  dateTimeForm = this.formBuilder.group({
    "date": new UntypedFormControl(null),
    "hour": new UntypedFormControl(null),
  })

  constructor(
    private formBuilder: UntypedFormBuilder,
  ) {
    this.dateTimeForm.valueChanges.pipe(
      tap(() => {
        this.updateSunSystem()
      })
    ).subscribe()
  }

  formatHoursLabel(value: number) {

    return value;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.sunSystem) {
      if (this.sunSystem) {
        this.initDateTimeForm()
      }
    }
  }

  initDateTimeForm() {
    const sunSystemDateTime = this.sunSystem.currentDateTime

    this.dateTimeForm.get('date').setValue(sunSystemDateTime, { emitEvent: false })
    this.dateTimeForm.get('hour').setValue(sunSystemDateTime.getHours(), { emitEvent: false })
  }

  updateSunSystem() {
    const date = new Date(this.dateTimeForm.get('date').value);
    date.setHours(this.dateTimeForm.get('hour').value)

    let utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0);

    this.sunSystem.update(this.sunSystem.currentPos, utcDate)
    this.map.instance.notifyChange()
  }
}
