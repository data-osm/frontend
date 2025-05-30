import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  Map,
} from "../../../../../../giro-3d-module"
import { ObjectEvent } from 'ol/Object';
import { merge, Observable, ReplaySubject, Subject, Subscriber } from 'rxjs';
import { filter, startWith, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { CartoHelper } from '../../../../../../../helper/carto.helper';
import { BaseMap } from '../../../../../../data/models/base-maps';
import { unByKey } from '../../../../../../ol-module';
import { DataOsmLayersServiceService } from '../../../../../../services/data-som-layers-service/data-som-layers-service.service';
import { fromOpenLayerEvent } from '../../../../../../shared/class/fromOpenLayerEvent';

@Component({
  selector: 'app-portail-base-map',
  templateUrl: './portail-base-map.component.html',
  styleUrls: ['./portail-base-map.component.scss']
})
export class PortailBaseMapComponent implements OnInit {

  public onInitInstance: () => void

  @Input() baseMap: BaseMap
  @Input() map: Map

  environment = environment

  toogleBaseMap: UntypedFormControl = new UntypedFormControl()
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public dataOsmLayersServiceService: DataOsmLayersServiceService
  ) {
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }
    merge(
      onInit,
      this.toogleBaseMap.valueChanges,

    ).pipe(
      takeUntil(this.destroyed$),
      filter(() => this.baseMap != undefined && this.map != undefined),
      tap((value) => {

        let layer = new CartoHelper(this.map).getLayerByPropertiesCatalogueGeosm({
          couche_id: this.baseMap.id,
          type: 'carte'
        })

        if (value == undefined) {
          if (layer.length > 0) {
            this.toogleBaseMap.setValue(true, { emitEvent: false })
          } else {
            this.toogleBaseMap.setValue(false, { emitEvent: false })
          }
        }

        if (layer.length > 0 && value == false) {
          this.dataOsmLayersServiceService.removeBaseMap(this.baseMap.id, this.map)
        } else if (layer.length == 0 && value == true) {
          this.dataOsmLayersServiceService.addBaseMap(this.baseMap, this.map, {
            share: true,
            metadata: true,
            opacity: true,
            removable: true
          })
        }
      })
    )
    // .subscribe()

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.baseMap) {
      if (this.baseMap) {
        this.onInitInstance()
        fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(), 'propertychange' as any).pipe(takeUntil(this.destroyed$), tap(() => { this.onInitInstance() })).subscribe()
      }
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

}