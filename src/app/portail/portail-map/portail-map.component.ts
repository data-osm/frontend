import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { AbstractProfilComponent } from '../abstract-profil/abstract-profil.component';
import { ParametersService } from '../../data/services/parameters.service';
import { MapsService } from '../../data/services/maps.service';
import { NotifierService } from 'angular-notifier';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ManageCompHelper } from '../../../helper/manage-comp.helper';
import { ActivatedRoute, Router } from '@angular/router';
import { DataOsmLayersServiceService } from '../../services/data-som-layers-service/data-som-layers-service.service';
import { BaseMapsService } from '../../data/services/base-maps.service';
import { ShareServiceService } from '../../services/share-service/share-service.service';
import { MatomoTracker } from 'ngx-matomo-client';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { OsmBulkSaveComponent } from '../../modal/osm-bulk-save/osm-bulk-save.component';
import { OSMUpdateStoreService } from '../../data/store/osm-update.store.service';
import { takeUntil, tap } from 'rxjs';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { Vector2 } from 'three';
import { RenderPass } from 'three/examples/jsm/Addons';
import { fromInstanceGiroEvent } from '../../shared/class/fromGiroEvent';
import { RightMenuInterface } from '../../type/type';

const _tempVec2 = new Vector2();

@Component({
  selector: 'app-portail-map',
  templateUrl: './portail-map.component.html',
  styleUrls: ['./portail-map.component.scss']
})
export class PortailMapComponent extends AbstractProfilComponent {

  /**
   * La sidenav
   */
  @ViewChild(MatSidenavContainer, { static: true }) sidenavContainer: MatSidenavContainer;


  @ViewChild('sidenav_right') sidenavRight: ElementRef<HTMLElement>


  @ViewChild('mapDiv') set myDiv(myDiv: ElementRef<HTMLDivElement>) {
    this.initialiseMap(myDiv)
  }
  osmUpdateStoreService: OSMUpdateStoreService

  rightMenus: Array<RightMenuInterface> = [
    { name: 'toc', active: false, enable: true, tooltip: 'toolpit_toc', title: 'table_of_contents', height: "100%" },
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data', height: "100%" },
    { name: 'edition', active: false, enable: false, tooltip: 'toolpit_tools', title: 'tools', height: "100%" },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing', height: "100%" },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend', height: "100%" },
    { name: 'import-data', active: false, enable: true, tooltip: 'import_data', title: 'import-data', height: "100%" },
    { name: 'scene_settings', active: false, enable: true, tooltip: 'toolpit_scene_settings', title: 'scene_settings', height: "200px" },
  ]

  constructor(
    // ngZone: NgZone,
    parametersService: ParametersService,
    mapService: MapsService,
    notifierService: NotifierService,
    translate: TranslateService,
    dialog: MatDialog,
    manageCompHelper: ManageCompHelper,
    activatedRoute: ActivatedRoute,
    dataOsmLayersService: DataOsmLayersServiceService,
    baseMapService: BaseMapsService,
    shareServiceService: ShareServiceService,
    router: Router,
    tracker: MatomoTracker,
    ngZone: NgZone,
    private _osmUpdateStoreService: OSMUpdateStoreService
  ) {


    super(manageCompHelper, shareServiceService, notifierService, parametersService, translate, activatedRoute, mapService, router, dialog, baseMapService, dataOsmLayersService, tracker, ngZone)
    this.osmUpdateStoreService = _osmUpdateStoreService

    this.osmUpdateStoreService.osmFeaturesInUpdateObservable.pipe(
      takeUntil(this.destroyed$),
      tap(() => {
        const osmBulkSaveDialog = this.getOsmBulkUpdateModal()

        if (osmBulkSaveDialog == undefined && this.osmUpdateStoreService.osmFeaturesInUpdate.length > 0) {
          this.showBulkSaveOSMButton()
        } else if (osmBulkSaveDialog != undefined && this.osmUpdateStoreService.osmFeaturesInUpdate.length == 0) {
          osmBulkSaveDialog.close()
        }
      })
    ).subscribe()
    if (this.dialog.openDialogs.filter(dialog => {
      return (
        dialog.componentInstance instanceof OsmBulkSaveComponent
      )
    }).length == 0 && this.osmUpdateStoreService.osmFeaturesInUpdate.length > 0) {
      this.showBulkSaveOSMButton()
    }
  }

  showBulkSaveOSMButton() {
    this.dialog.open(OsmBulkSaveComponent, {
      hasBackdrop: false,
      position: {
        bottom: "10px",
        right: "10px"
      },
      width: "360px",
      height: "45px",
      disableClose: true,
      panelClass: ['dialog-no-padding', "dialog-no-shadow", "dialog-bg-transparent"],
    })
  }

  getOsmBulkUpdateModal() {
    const osmBulkSaveIsDialogs = this.dialog.openDialogs.filter(dialog => {
      return (
        dialog.componentInstance instanceof OsmBulkSaveComponent
      )
    })
    if (osmBulkSaveIsDialogs.length > 0) {
      return osmBulkSaveIsDialogs[0]
    }
    return undefined
  }

  toggleOsmBuildingUpdate() {
    let shouldResetToggleRnbButton = true
    if (this.osmUpdateStoreService.isOsmBuildingUpdateEnabled) {
      this.tracker.trackEvent("toggleOsmBuildingUpdate", "disabled")
      if (this.osmUpdateStoreService.osmFeaturesInUpdate.length > 0) {
        shouldResetToggleRnbButton = false
        this.notifierService.notify("warning", "Veuillez sauvegarder les modifications avant")
      } else {
        this.osmUpdateStoreService.disableOsmBuildingUpdate()

      }

    } else {
      this.tracker.trackEvent("toggleOsmBuildingUpdate", "enabled")
      this.osmUpdateStoreService.enableOsmBuildingUpdate()
    }
    if (shouldResetToggleRnbButton) {
      // @ts-expect-error
      document.getElementsByClassName("toggle-rnb-edit")[0].style.display = 'none'
      setTimeout(() => {
        // @ts-expect-error
        document.getElementsByClassName("toggle-rnb-edit")[0].style.display = 'flex'
      }, 1000);
    }

  }




}