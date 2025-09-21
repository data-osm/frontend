import { R } from '@angular/cdk/keycodes';
import { Component, OnInit, Input, Inject, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { MatLegacySelectionList as MatSelectionList, MatLegacySelectionListChange as MatSelectionListChange } from '@angular/material/legacy-list';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import {
  Map,
} from "../../../../../giro-3d-module"
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CartoHelper } from '../../../../../../helper/carto.helper';
import { MapsService } from '../../../../../data/services/maps.service';
import { DataOsmLayersServiceService } from '../../../../../services/data-som-layers-service/data-som-layers-service.service';
import { coucheInterface, Group, groupThematiqueInterface, Layer, SubGroup, SubGroupWithLayers } from '../../../../../type/type';
import { MatomoTracker } from 'ngx-matomo-client';
import { MatSelectionList } from '@angular/material/list';
import { layer } from '@fortawesome/fontawesome-svg-core';
import { fromMapGiroEvent } from '../../../../../shared/class/fromGiroEvent';

@Component({
  selector: 'app-list-group-thematique',
  templateUrl: './list-group-thematique.component.html',
  styleUrls: ['./list-group-thematique.component.scss']
})
/**
 * List contents of a group thematique
 */
export class ListGroupThematiqueComponent implements OnInit {
  public onInitInstance: () => void

  subGroupList$: Observable<SubGroupWithLayers[]>

  groupSelectForm: UntypedFormControl = new UntypedFormControl()

  private readonly notifier: NotifierService;
  environment = environment

  @ViewChildren(MatSelectionList) set matSelectionLists(matSelectionLists: QueryList<MatSelectionList>) {
    if (matSelectionLists) {
      matSelectionLists.map((matSelectionList) => {
        matSelectionList.selectionChange.pipe(
          withLatestFrom(this.subGroupList$),
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
    public dialogRef: MatDialogRef<ListGroupThematiqueComponent>,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    private readonly tracker: MatomoTracker,
    @Inject(MAT_DIALOG_DATA) public parameters: { selected_group: Group, map: Map, groups: Array<Group> }
  ) {
    this.notifier = notifierService;
    this.groupSelectForm.setValue(this.parameters.selected_group)
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }


    this.subGroupList$ =
      merge(
        this.dataOsmLayersServiceService.groupsLayerInMapObservable,
        this.groupSelectForm.valueChanges.pipe(startWith(this.groupSelectForm.value), tap((group) => {
          tracker.trackEvent("Group", "changed", group.name)
        }))
      ).pipe(
        filter(() => this.groupSelectForm.value != null),
        switchMap(() => {
          const group = this.groupSelectForm.value as Group

          return this.mapsService.getAllSubGroupWithLayersOfGroup(group.group_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY }),
          )
        }),
        map((subGroups) => {
          for (let subGroup of subGroups) {
            subGroup.layers.map((layer) => {
              layer.isSelected = this.isLayerInMap(layer)
              layer.shouldDisabled = this.shouldDisabled(layer)
              return layer
            })
          }
          return subGroups
        }),
        shareReplay(1),
      )

  }

  trackGroupSelectTriggered() {
    this.tracker.trackEvent("Open", "select-group")
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  /**
  * Is this layer entire defined in the adminstrative panel ?
  * If it is not, we can not add it to the map
  * @param layer Layer
  */
  shouldDisabled(layer: Layer): boolean {
    if ((layer.providers.length == 0 || layer.providers?.filter((provider) => provider.vp.state == 'good').length == 0)) {
      return true
    } else {
      return false
    }
  }

  isLayerInMap(layer: Layer) {
    return this.dataOsmLayersServiceService.groupsLayerInMap.find((groupLayer) => groupLayer.layer.layer_id == layer.layer_id) != undefined

  }


}
