import { Component, ElementRef, ViewChild } from '@angular/core';
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
    tracker: MatomoTracker
  ) {
    // super()
    super(manageCompHelper, shareServiceService, notifierService, parametersService, translate, activatedRoute, mapService, router, dialog, baseMapService, dataOsmLayersService, tracker)

  }



}