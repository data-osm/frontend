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
import { Group } from '../../type/type';
import { ListAllLayersComponent } from '../pages/sidenav-left/sidenave-left-secondaire/list-all-layers/list-all-layers.component';
import { CartoHelper } from '../../../helper/carto.helper';
import { partial } from '../../../utils/partial';
import { constructPSRLayer } from './construct-psr-layer';
import { OrbitControls } from '../../giro-3d-module';
import { fromInstanceGiroEvent } from '../../shared/class/fromGiroEvent';
import { tap } from 'rxjs';
import { AdditiveBlending, Box3, Box3Helper, BoxGeometry, BufferGeometry, Clock, Color, DirectionalLight, Euler, Float32BufferAttribute, HemisphereLight, ImageLoader, Line, LineBasicMaterial, LineSegments, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, Quaternion, Raycaster, RingGeometry, Scene, SRGBColorSpace, Texture, Vector3, WebGLRenderer } from 'three';
import { createXYZ } from 'ol/tilegrid';
import { BoxLineGeometry, XRButton, XRControllerModelFactory, VRButton } from 'three/examples/jsm/Addons';
import WebXRPolyfill from 'webxr-polyfill';


@Component({
  selector: 'app-psr',
  templateUrl: './psr.component.html',
  styleUrls: ['./psr.component.scss']
})

export class PsrComponent extends AbstractProfilComponent {


  /**
   * La sidenav
   */
  @ViewChild(MatSidenavContainer, { static: true }) sidenavContainer: MatSidenavContainer;


  @ViewChild('sidenav_right') sidenavRight: ElementRef<HTMLElement>


  @ViewChild('mapDiv') set myDiv(myDiv: ElementRef<HTMLDivElement>) {
    this.initialiseMap(myDiv)
  }

  mesh: Mesh

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
  // To debug method CartoHelper.getMapExtent
  // extendLoad = undefined
  // addExtent() {
  //   if (this.extendLoad != undefined) {
  //     this.instance.remove(this.extendLoad)
  //     this.extendLoad = undefined
  //   } else {
  //     const mapExtent = CartoHelper.getMapExtent(this.map)
  //     let box = mapExtent.toBox3(0, 40)
  //     const boxDim = box.getSize(new Vector3())

  //     console.log(box.getSize(new Vector3()))
  //     // if (this.instance.view.camera.rotation.z > 0) {
  //     //   // box.min.sub(new Vector3(0, boxDim.y / 2, 0))
  //     // } else {
  //     //   // box.max.sub(new Vector3(0, boxDim.y / 2, 0))

  //     // }
  //     // const rotationAngle = this.instance.view.camera.rotation.z; // 45 degrees

  //     // console.log(box.getSize(new Vector3()))

  //     const dimensions = new Vector3();
  //     box.getSize(dimensions);
  //     const center = new Vector3();
  //     box.getCenter(center);

  //     // Create a Box geometry
  //     const geometry = new BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
  //     const material = new MeshBasicMaterial({ color: 0x00ff00 }); // Wireframe box
  //     material.fog = false
  //     this.mesh = new Mesh(geometry, material);
  //     this.mesh.position.copy(center);

  //     this.extendLoad = this.mesh.clone()
  //     this.instance.add(this.extendLoad)
  //   }
  // }

  setConstructLayerFunction() {
    this.dataOsmLayersService.setConstructLayerFunction(partial(constructPSRLayer, this.map, this.instance, this.instance.view.controls as OrbitControls))
  }


  /**
   * Initialise active group of the profil. 
   * Will opened it by default
   * @param group 
   */
  initialiseActiveGroup(group: Group, groups: Array<Group>) {


    let groupModalConfig = this.getActiveGroupConfig()

    this.groupDialog = this.dialog.open(ListAllLayersComponent, {
      data: {
        selected_group: group,
        map: this.map,
        groups: groups
      },
      position: groupModalConfig.position,
      width: groupModalConfig.width,
      height: groupModalConfig.height,
      maxHeight: '100%',
      maxWidth: '100%',
      hasBackdrop: false,
      disableClose: true,
      panelClass: ['dialog-no-padding', "group-modal"],
    })

    if (CartoHelper.isMobile()) {
      this.toggleGroupDialog()
    }

  }

}