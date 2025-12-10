import { Component, Input, SimpleChanges } from '@angular/core';
import {
  Map,
} from "../../../../giro-3d-module"
import { SunSystem } from '../../../../processing/sunSystem';
import { UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { tap } from 'rxjs/operators';
import { MatomoTracker } from 'ngx-matomo-client';
import { ParametersService } from '../../../../data/services/parameters.service';

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
    protected readonly tracker: MatomoTracker,
    private parameterService: ParametersService
  ) {
    // we first disable the form, and we enable it when sunSystem is defined
    this.dateTimeForm.disable()

  }

  syncSunSystem() {
    this.dateTimeForm.valueChanges.pipe(
      tap(() => {
        if (this.sunSystem) {

          this.updateSunSystem()
          this.tracker.trackEvent("Change", "Scene settings", "date-heure")
        }
      })
    ).subscribe()
  }

  formatHoursLabel(value: number) {
    return value;
  }

  get dateTimesInterval() {
    return {
      "start": Boolean(this.parameterService.dateTimesInterval.start) ? new Date(this.parameterService.dateTimesInterval.start) : null,
      "end": Boolean(this.parameterService.dateTimesInterval.end) ? new Date(this.parameterService.dateTimesInterval.end) : null
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.sunSystem) {
      if (this.sunSystem) {
        this.initDateTimeForm()
        this.syncSunSystem()
      }
    }
  }

  initDateTimeForm() {
    this.dateTimeForm.enable()
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
