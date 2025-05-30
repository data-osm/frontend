import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { GeoJSON, Map } from '../../../../ol-module';
import { catchError, filter, sampleTime, switchMap, takeUntil, tap } from 'rxjs/operators';
import { geosignetsProjectInterface } from '../../../../type/type';
import { CartoHelper } from '../../../../../helper/carto.helper';
import { ParametersService } from '../../../../data/services/parameters.service';
import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { AppExtent } from '../../../../data/models/parameters';

@Component({
  selector: 'app-select-roi',
  templateUrl: './select-roi.component.html',
  styleUrls: ['./select-roi.component.scss']
})
/**
 * select an ROI
 */
export class SelectRoiComponent implements OnInit {
  public onInitInstance: () => void
  @Input() map: any


  /**
   * Control to manage user interaction while he change ROI
   */
  controlSelectRoi: UntypedFormControl = new UntypedFormControl()

  lisAppExtent$: Observable<AppExtent[]>

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  constructor(
    public parameterService: ParametersService
  ) {
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.lisAppExtent$ = onInit.pipe(
      switchMap(() => {
        return this.parameterService.lisAppExtent$.pipe(
          filter((value) => value && value.length > 0),
          catchError(() => {
            return EMPTY
          })
        )
      }),
      tap((listAppExten) => {
        if (this.parameterService.parameter && this.parameterService.parameter.extent_pk) {
          this.controlSelectRoi.setValue(listAppExten.find((appExtent) => appExtent.id == this.parameterService.parameter.extent_pk), { emitEvent: false })
        }
      })
    )

    this.controlSelectRoi.valueChanges.pipe(
      filter(value => typeof value == 'object'),
      tap((value: AppExtent) => {
        // new CartoHelper(this.map).fit_view([value.a, value.b, value.c, value.d], 10)
      }),
      takeUntil(this.destroyed$)
    ).subscribe()


  }

  ngOnInit(): void {

  }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.map) {
      if (this.map) {
        this.onInitInstance()
      }

    }
  }

}
