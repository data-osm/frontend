import { Component, OnInit, Input, Inject, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatLegacySelectionList as MatSelectionList, MatLegacySelectionListChange as MatSelectionListChange } from '@angular/material/legacy-list';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import {
  Map,
} from "../../../../../giro-3d-module"
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, combineAll, map, mergeAll, mergeMap, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CartoHelper } from '../../../../../../helper/carto.helper';
import { MapsService } from '../../../../../data/services/maps.service';
import { DataOsmLayersServiceService } from '../../../../../services/data-som-layers-service/data-som-layers-service.service';
import { coucheInterface, Group, groupThematiqueInterface, Layer, SubGroup, SubGroupWithLayers } from '../../../../../type/type';
import { MatomoTracker } from 'ngx-matomo-client';


@Component({
  selector: 'app-list-all-layers',
  templateUrl: './list-all-layers.component.html',
  styleUrls: ['./list-all-layers.component.scss']
})
/**
 * List all layers of all groups directly
 */
export class ListAllLayersComponent {
  public onInitInstance: () => void

  layers$: Observable<Layer[]>

  private readonly notifier: NotifierService;
  environment = environment

  @ViewChildren(MatSelectionList) set matSelectionLists(matSelectionLists: QueryList<MatSelectionList>) {
    if (matSelectionLists) {
      matSelectionLists.map((matSelectionList) => {
        matSelectionList.selectionChange.pipe(
          withLatestFrom(this.layers$),
          tap((parameters) => {

            let isOptionSelected: boolean = parameters[0].options[0].selected
            let layer: Layer = parameters[0].options[0].value

            if (isOptionSelected) {
              try {
                this.dataOsmLayersServiceService.addLayer(layer, this.parameters.map, this.parameters.selected_group)
              } catch (error) {
                parameters[0].options[0].toggle()
              }
            } else {
              try {
                this.dataOsmLayersServiceService.removeLayer(layer.layer_id, this.parameters.map)
              } catch (error) {
                parameters[0].options[0].toggle()

              }
            }
          })
        ).subscribe()
      })

    }

  }

  constructor(
    public fb: UntypedFormBuilder,
    public mapsService: MapsService,
    public translate: TranslateService,
    notifierService: NotifierService,
    public dialogRef: MatDialogRef<ListAllLayersComponent>,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    private readonly tracker: MatomoTracker,
    @Inject(MAT_DIALOG_DATA) public parameters: { selected_group: Group, map: Map, groups: Array<Group> }
  ) {
    this.notifier = notifierService;
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.layers$ = merge(parameters.groups.map((group) => {
      return this.mapsService.getAllSubGroupWithLayersOfGroup(group.group_id)
    })).pipe(
      combineAll(),
      map((subGroups) => {
        let flatDeep = (arr) => {
          return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val), []);
        };
        const allSubGroups: Array<SubGroupWithLayers> = flatDeep(subGroups)
        const layers: Layer[] = flatDeep(allSubGroups.map((subGroup) => subGroup.layers))

        return layers
      })
    )


  }



  ngOnInit(): void {
    this.onInitInstance()
  }


}
