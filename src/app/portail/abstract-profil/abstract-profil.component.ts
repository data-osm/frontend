import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injectable, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, combineLatest, concat, EMPTY, forkJoin, from, fromEvent, iif, interval, merge, Observable, of, ReplaySubject, Subject, Subscriber, timer } from 'rxjs';
import { catchError, debounceTime, delay, delayWhen, filter, map, mergeMap, retryWhen, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, toArray, withLatestFrom } from 'rxjs/operators';
import { CartoHelper } from '../../../helper/carto.helper';
import { ManageCompHelper } from '../../../helper/manage-comp.helper';
import { BaseMap } from '../../data/models/base-maps';
import { MapsService } from '../../data/services/maps.service';
import { ParametersService } from '../../data/services/parameters.service';
import {
  GeoJSON,
} from '../../ol-module';
import { environment } from '../../../environments/environment';


import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

import { DataOsmLayersServiceService } from '../../services/data-som-layers-service/data-som-layers-service.service';

import { Group, Layer, rightMenuInterface } from '../../type/type';
import { ContextMenuComponent } from '../pages/context-menu/context-menu.component';
import { DescriptiveSheetData } from '../pages/descriptive-sheet/descriptive-sheet.component';
import { BaseMapsService } from '../../data/services/base-maps.service';
import { ListGroupThematiqueComponent } from '../pages/sidenav-left/sidenave-left-secondaire/list-group-thematique/list-group-thematique.component';
import { DirectionalLight, MathUtils, Vector3, PerspectiveCamera, Color, AmbientLight, Fog, Vector2 } from 'three/src/Three';


import {
  Extent,
  Instance,
  Map,
  OrbitControls,

} from "../../giro-3d-module"
import Inspector from '@giro3d/giro3d/gui/Inspector.js';
import ProcessingInspector from '@giro3d/giro3d/gui/ProcessingInspector'
import FrameDuration from "@giro3d/giro3d/gui/charts/FrameDuration"
import { fromInstanceGiroEvent } from '../../shared/class/fromGiroEvent';
import Stats from "stats-js"
import { dataFromClickOnMapInterface, MapMousseEvents } from '../../processing/map-mousse-events';
import { ShareServiceService, VIEW_QUERY_PARAM } from '../../services/share-service/share-service.service';
import { MatomoTracker } from 'ngx-matomo-client';
import { GroundTileProcessing } from '../../processing/ground-tile-processing';
import { AppExtent } from '../../data/models/parameters';
import { AppInjector } from '../../../helper/app-injector.helper';
import { constructLayer } from './construct-layer';
import { partial } from '../../../utils/partial';
import { FrameRenderTime } from '../../../helper/type';

const extent = new Extent(
  'EPSG:3857',
  -20037508.342789244,
  20037508.342789244,
  -20048966.1,
  20048966.1,
);


const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const temp2Vec3 = new Vector3()

@Injectable()
export abstract class AbstractProfilComponent implements OnInit {

  /**  
   * Map object 
  */
  map: Map = new Map({ maxSubdivisionLevel: undefined, extent, terrain: false, showOutline: false, backgroundColor: "gray" });
  instance: Instance = null
  controls: MapControls
  frameRenderTime: { [key: number]: FrameRenderTime } = {}

  onInitInstance: () => void;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * Context menu component of the app
   */
  // @ViewChild(ContextMenuComponent, { static: true }) ContextMenuComp: ContextMenuComponent;

  /**
   * La sidenav
   */
  sidenavContainer: MatSidenavContainer;


  sidenavRight: ElementRef<HTMLElement>

  /**
   * List of the profil group
   */
  groups$: Observable<Array<Group>>

  /**
   * Dialog of the active group
   */
  groupDialog: MatDialogRef<any, any>

  private readonly notifier: NotifierService;


  /**
   * All menus of the right sidenav
   */
  rightMenus: Array<rightMenuInterface> = [
    { name: 'toc', active: false, enable: true, tooltip: 'toolpit_toc', title: 'table_of_contents' },
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data' },
    { name: 'edition', active: false, enable: false, tooltip: 'toolpit_tools', title: 'tools' },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing' },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend' },
  ]

  // dialog: MatDialog = AppInjector.get(MatDialog);

  getOrCreateFrameRenderTime(obj: { [key: number]: FrameRenderTime }, key: number): FrameRenderTime {
    if (!obj[key]) {
      obj[key] = {
        "render_time": undefined,
        "total_render_time": undefined,
      };
    }
    return obj[key];
  }

  constructor(
    protected manageCompHelper: ManageCompHelper,
    protected shareServiceService: ShareServiceService,
    protected notifierService: NotifierService,
    protected parametersService: ParametersService,
    protected translate: TranslateService,
    protected activatedRoute: ActivatedRoute,
    protected mapService: MapsService,
    protected router: Router,
    protected dialog: MatDialog,
    protected baseMapService: BaseMapsService,
    protected dataOsmLayersService: DataOsmLayersServiceService,
    protected readonly tracker: MatomoTracker
  ) {
    this.notifier = notifierService;


    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    // Handle url query params when app is open
    combineLatest(onInit, this.activatedRoute.queryParams).pipe(
      take(1),
      switchMap((parameters) => {
        return this.getAppExtentGeometry(parameters).pipe(
          map((appExtent) => {
            return { parameters, appExtent }
          })
        )
      }),
      tap((data) => {
        this.initialiseMapCenter(data.parameters, data.appExtent)
        this.updateCurrentUrl()
        this.initialiseClickEvent()
      }),
      delay(500),
      tap(() => {
        this.initialiseGroundTileProcessing()

      })
    ).subscribe()

    this.initialiseProfilGroups()
    this.initialiseBaseMaps()
    this.initialiseListAppRegions()

    // Retrieve and display shared layers if exist, or default layers of the profil if exist
    combineLatest(this.activatedRoute.queryParams, this.groups$).pipe(
      takeUntil(this.destroyed$),
      switchMap((data) => {
        return this.getSharedLayersInUrl(data[0], data[1]).pipe(
          map((layers_groups) => {
            return { "layers_groups": layers_groups, "groups": data[1] }
          })
        )
      }),
      switchMap((data) => {

        const layers_groups = data.layers_groups

        // if no layer have been shared, we display the default/active layer of the profil
        const principalGroup = data.groups.find((group) => group.principal)

        if (layers_groups.length == 0 && principalGroup) {
          return this.mapService.getAllPrincipalLayersFromGroup(
            principalGroup.group_id,
            true
          ).pipe(
            filter((layers) => layers.length > 0),
            map((layers) => {
              return layers.map((layer) => {
                return {
                  layer: layer,
                  group: principalGroup
                }
              })
            })
          )
        } else if (layers_groups.length > 0) {
          return of(layers_groups)
        } else {
          return EMPTY
        }
      }),
      filter(() => {
        // Ensure base map is already add to map : map is ready to receive layers
        let prinicpalBaseMapLoaded = new CartoHelper(this.map).getAllLayersInToc()
          .filter((layerProp) => layerProp.type_layer == 'geosmCatalogue')
          .filter((layerProp) => layerProp.properties['type'] == 'carte')
          .map((layerProp) => this.dataOsmLayersService.getBasemap(layerProp.properties['couche_id']))
          .filter((baseMap) => baseMap && baseMap.principal)

        if (prinicpalBaseMapLoaded.length == 0) {
          throw 'Basemap not yet loaded'
        }
        return prinicpalBaseMapLoaded.length > 0
      }),
      switchMap((layers_groups) => {
        const controlsIsDefine$ = new BehaviorSubject(this.controls != undefined)
        const updateControlSubscription = interval(100).subscribe(() => {
          controlsIsDefine$.next(this.controls != undefined);
        });
        return controlsIsDefine$.pipe(
          filter((controlIsDefine) => controlIsDefine),
          map(() => {
            updateControlSubscription.unsubscribe()
            return layers_groups
          }),
        );
      }),
      delay(500),
      tap((layers_groups) => {

        layers_groups.map((layer_group, index) => {

          setTimeout(() => {
            if (typeof layer_group == 'number') {
              let baseMap = this.dataOsmLayersService.getBasemap(layer_group)
              if (baseMap) {
                this.dataOsmLayersService.addBaseMap(baseMap, this.map, {
                  share: true,
                  metadata: true,
                  opacity: true,
                  removable: true
                })
              }
            } else {
              this.dataOsmLayersService.addLayer(layer_group.layer, this.map, layer_group.group)
            }
          }, index * 500);
        })
      })
    ).subscribe()

  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

  /**
   * Initialise the map
   * @param mapDomElement ElementRef<HTMLDivElement>
   */
  initialiseMap(mapDomElement: ElementRef<HTMLDivElement>) {

    this.instance = new Instance({
      target: mapDomElement.nativeElement,
      crs: extent.crs,
      renderer: {
        antialias: this.getSystemPerformance() == "high" ? true : false
      }
    });
    // this.instance.renderer.setPixelRatio(1);
    // Enable shader errors in Dev
    if (!environment.production) {
      this.instance.renderer.debug.checkShaderErrors = true
    }

    this.instance.add(this.map);

    // Background of the scene
    const scene = this.instance.scene
    scene.background = new Color().setHSL(0.6, 1, 0.6);
    // scene.fog = new Fog(0x2f3640, 5, 4000);
    scene.fog = new Fog(0x2f3640, 5, 20000);

    this.addStats()
    this.addLights()

    this.setConstructLayerFunction()

    this.updateCompassRotation()

  }

  registerNewRenderTime(frame: number, render_time: number) {
    this.getOrCreateFrameRenderTime(this.frameRenderTime, frame).render_time = render_time


  }

  registerNewTotalRenderTime(frame: number, total_render_time: number) {
    this.getOrCreateFrameRenderTime(this.frameRenderTime, frame).total_render_time = total_render_time

    if (Object.keys(this.frameRenderTime).length >= 50) {
      const layers = new CartoHelper(this.map).getAllLayersInToc().
        filter((layerProp) => layerProp.type_layer == 'geosmCatalogue')
        .filter((layerProp, index, self) => {
          /**
           * unique layer ^^
           */
          return self.map((item) => item.properties.couche_id + item.properties['type']).indexOf(layerProp.properties.couche_id + layerProp.properties['type']) === index;

        }).filter((layerProp) => layerProp.properties["type"] == "couche").map((layerProp) => {

          return { "layer_id": layerProp.properties["couche_id"], "layer_name": layerProp.nom }
        })

      const mapExtent = CartoHelper.getMapExtent(this.map)
      const mapSize = mapExtent.dimensions()

      this.parametersService.logRenderTimePerFrame(this.frameRenderTime, layers.map((layer) => layer.layer_id), layers.map((layer) => layer.layer_name), mapSize.toArray(), mapExtent.values.join(","), window.location.href).pipe(take(1)).subscribe()
      this.frameRenderTime = {}
    }
  }

  addStats() {


    let updateStart = (performance || Date).now(), renderStart = updateStart;

    // Enable Stats in DEv mode

    if (!environment.production) {
      const inspector = new Inspector("giro3d-inspector", this.instance)
      // inspector.gui.
      // inspector.gui.onFinishChange(() => {
      inspector.folders.filter((f) => f instanceof ProcessingInspector).map((f) => {

        f["charts"].forEach((c) => {
          if (c instanceof FrameDuration == false) {
            c.dispose()
          } else {
            f.gui.open()
            c.gui.open()
          }
        })
      })
      inspector.folders.filter((f) => f instanceof ProcessingInspector == false).map((f) => {
        f.dispose()
      })

      var stats = new Stats();
      // We prefer to not use FPS, but the number of seconds to draw a frame (SecondPerFrame) 
      // See http://www.opengl-tutorial.org/fr/miscellaneous/an-fps-counter/

      stats.showPanel(0);
      document.body.appendChild(stats.dom);
    }


    this.instance.addEventListener("update-start", (e) => {
      updateStart = (performance || Date).now();
      if (!environment.production) {
        stats.begin();
      }

    })
    this.instance.addEventListener("update-end", (e) => {
      const now = (performance || Date).now();
      this.registerNewTotalRenderTime(e.frame, now - updateStart)
      if (!environment.production) {
        stats.end();
      }
    })

    this.instance.addEventListener('before-render', () => {
      renderStart = (performance || Date).now();
    });

    this.instance.addEventListener('after-render', e => {
      const now = (performance || Date).now();
      this.registerNewRenderTime(e.frame, now - renderStart)
    });


  }

  /**
   * Add control, with his target position
   * @param position 
   */
  addControls(position: Vector3, target_position: Vector3 = undefined) {
    if (target_position == undefined) {
      target_position = position
    }
    const camera = this.instance.view.camera as PerspectiveCamera

    this.instance.view.camera.position.set(position.x, position.y, position.z);
    // const lookAt = new Vector3(position.x, position.y + 1, 50);
    this.instance.view.camera.lookAt(target_position);

    camera.updateProjectionMatrix();
    this.controls = new MapControls(this.instance.view.camera, this.instance.domElement);
    this.controls.maxPolarAngle = Math.PI / 2 - (Math.PI / 10)
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.zoomToCursor = true
    this.controls.target.copy(target_position);
    this.controls.saveState();
    // this.controls.target.set(0, 0, 0)
    this.instance.view.setControls(this.controls);
  }

  addLights() {
    const sun = new DirectionalLight('#ffffff', 2);
    sun.position.set(1, 0, 1).normalize();
    sun.updateMatrixWorld(true);
    this.instance.scene.add(sun);


    // We can look below the floor, so let's light also a bit there

    const sun2 = new DirectionalLight('#ffffff', 0.5);
    sun2.position.set(0, 1, 1);
    sun2.updateMatrixWorld();
    this.instance.scene.add(sun2);

    // ambient
    const ambientLight = new AmbientLight(0xffffff, 0.2);
    this.instance.scene.add(ambientLight);

  }

  /**
   * Define the function responsible to construct a layer that can be added to the map
   */
  setConstructLayerFunction() {
    this.dataOsmLayersService.setConstructLayerFunction(partial(constructLayer, this.map, this.instance))
  }

  /**
   * Continue update the compass icon when user move map
   */
  updateCompassRotation() {
    fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
      takeUntil(this.destroyed$),
      tap(() => {
        // MathUtils.
        const compassButton: HTMLElement = (document.getElementsByClassName("compass").item(0) as HTMLElement)
        if (compassButton) {
          compassButton.style.rotate = MathUtils.radToDeg(this.instance.view.camera.rotation.z) + "deg"
        }
      })
    ).subscribe()
  }

  /**
   * Update url when ever map moved or layer are add/remove
   */
  updateCurrentUrl() {
    fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
      debounceTime(500),
      tap((camera) => {
        this.shareServiceService.updateUrlWithPointOfView(this.map)
      })
    )
      .subscribe()
  }

  initialiseClickEvent() {
    fromEvent<MouseEvent>(this.instance.domElement, "click").pipe(
      takeUntil(this.destroyed$),
      tap((e) => {
        let dataFromClickOnMap: dataFromClickOnMapInterface
        try {
          dataFromClickOnMap = new MapMousseEvents(this.map).onClicked(e)
        } catch (error) {

        }

        if (dataFromClickOnMap) {
          const layer = dataFromClickOnMap.data.layers.length > 0 ? dataFromClickOnMap.data.layers[0] : undefined
          let sheetData: DescriptiveSheetData = {
            type: layer.userData.descriptionSheetCapabilities as string,
            coordinates_3857: dataFromClickOnMap.data.coord,
            point: dataFromClickOnMap.data.point,
            layer_id: layer.userData.properties["couche_id"] as number,
            map: this.map,
            feature: dataFromClickOnMap.data.feature,
            layer: layer,
            object: dataFromClickOnMap.data.object
          }
          this.manageCompHelper.openDescriptiveSheetModal(sheetData, [])

        }

      })
    )
      .subscribe()
  }

  /**
   * Get app extent geometry 
   * @param parameters 
   */
  getAppExtentGeometry(parameters: [void, Params]) {

    return this.parametersService.getAppExtent(true).pipe(
      take(1),
      catchError((error: HttpErrorResponse) => {
        this.notifier.notify("error", this.translate.instant('portail.error_loading.extent'));
        return EMPTY
      }),
      map((appExtent) => {
        return appExtent
      })
    )

  }

  initialiseMapCenter(parameters: [void, Params], appExtent: AppExtent) {

    this.parametersService.projectPolygon = new GeoJSON().readFeature(appExtent.st_asgeojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    let params = parameters[1]
    if (params[VIEW_QUERY_PARAM]) {
      try {
        let pov: string = params['pos'];

        const [x, y, z, tx, ty, tz] = CartoHelper.get_parameters_from_pov(this.map, pov)
        this.addControls(tempVec3.set(x, y, z), temp2Vec3.set(tx, ty, tz))
        // CartoHelper.goToPointOfView(this.map, pov)
      } catch (error) {
        let parisPov = "260354.7,6252644.5,301.2,259689,6252821.8,0"
        this.addControls(tempVec3.set(260354.7, 6252644.5, 301.2), temp2Vec3.set(259689, 6252821.8, 0))
      }

    } else {
      let parisPov = "260354.7,6252644.5,301.2,259689,6252821.8,0"
      this.addControls(tempVec3.set(260354.7, 6252644.5, 301.2), temp2Vec3.set(259689, 6252821.8, 0))
      // CartoHelper.goToPointOfView(this.map, parisPov)

      // window.addEventListener("mousemove", (event) => {
      //   document.getElementById("besideMouse").style.top = event.pageY + 10 + "px"
      //   document.getElementById("besideMouse").style.left = event.pageX + 10 + "px"
      //   document.getElementById("besideMouse").textContent = event.clientX + "," + event.clientY
      // })

    }
  }

  /**
   * Initialise all the base ground layers
   * - Building
   * - Trees
   */
  initialiseGroundTileProcessing() {
    new GroundTileProcessing(this.map)
  }

  initialiseProfilGroups() {
    this.groups$ = this.activatedRoute.queryParams.pipe(
      mergeMap(params =>
        iif(
          () => params['profil'] == undefined,
          this.parametersService.getParameters().pipe(
            catchError((error: HttpErrorResponse) => {
              this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter'));
              return EMPTY
            }),
            map((parameter) => {
              return parameter.map.map_id
            })
          ),
          this.parametersService.getParameters().pipe(
            catchError((error: HttpErrorResponse) => {
              this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter'));
              return EMPTY
            }),
            map(() => {
              return parseInt(params['profil'])
            })
          )
        )
      ),
      switchMap((map_id) => {
        this.parametersService.map_id = map_id
        return this.mapService.getAllGroupOfMap(map_id).pipe(
          catchError((error: HttpErrorResponse) => {
            this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter'));
            this.router.navigateByUrl('/map').then(() => {
              window.location.reload();
            })
            return EMPTY
          }),
          tap((groups) => {
            if (groups.length == 0) {
              this.router.navigateByUrl('/map').then(() => {
                window.location.reload();
              })
            } else {
              let activeProfilGroup = groups.find((group) => group.principal)
              if (activeProfilGroup == undefined) {
                activeProfilGroup = groups[0]
              }

              this.initialiseActiveGroup(activeProfilGroup, groups)

            }
          })
        )
      })
    )
  }

  /**
   * Fetch app base maps
   */
  initialiseBaseMaps() {

    this.baseMapService.getBaseMaps().pipe(
      take(1),
      catchError((error: HttpErrorResponse) => {
        this.notifier.notify("error", this.translate.instant('portail.error_loading.basemaps'));
        return EMPTY
      }),
      tap((basemaps) => {
        let principalMap = basemaps.find((item) => item.principal) ? basemaps.find((item) => item.principal) : basemaps[0]
        this.dataOsmLayersService.addBasemaps(basemaps)
        this.addPrincipalMapLayer(principalMap)
      })
    ).subscribe()

  }

  initialiseListAppRegions() {
    return this.parametersService.getListAppExtent(true, 0.07).pipe(
      catchError((error: HttpErrorResponse) => {
        this.notifier.notify("error", this.translate.instant('portail.error_loading.extent'));
        return EMPTY
      }),
    )
  }

  getSharedLayersInUrl(parameters: Params, groups: Array<Group>) {
    let getLayers$: Array<
      Observable<{
        layer: Layer;
        group: Group;
      } | number>
    > = []

    if (parameters['layers']) {
      let shareParameters: Array<[string, string, string]> = parameters['layers'].split(';').map((item) => item.split(',').map((u) => u))

      getLayers$ = shareParameters
        .map((shareParam) => {
          if (shareParam[2] == 'layer' && groups.find((group) => group.group_id === parseInt(shareParam[1])) != undefined) {
            let group = groups.find((group) => group.group_id === parseInt(shareParam[1]))
            return this.mapService.getLayer(parseInt(shareParam[0])).pipe(
              catchError((error: HttpErrorResponse) => {
                return EMPTY
              }),
              map((layer) => {
                return {
                  layer: layer,
                  group: group
                }
              })
            )
          }
          else if (shareParam[2] == 'map') {

            return of(parseInt(shareParam[0]))
          }

        })

    }

    return concat(...getLayers$).pipe(toArray())
  }

  /**
   * Add the principal base map to map
   * @param principalMap BaseMap
   */
  addPrincipalMapLayer(principalMap: BaseMap) {

    var type;
    if (principalMap.protocol_carto == 'wms') {
      type = 'wms'
    } else if (principalMap.protocol_carto == 'wmts') {
      type = 'xyz'
    }

    this.dataOsmLayersService.addBaseMap(principalMap, this.map, {
      share: false,
      metadata: true,
      opacity: true,
      removable: false
    })
  }

  getActiveGroupConfig() {
    let groupModalConfig = {
      position: {
        left: '65px',
        top: "5vh",
        bottom: '10vh',
      },
      width: '400px',
      height: '85%',
    }

    if (CartoHelper.isMobile()) {
      delete groupModalConfig.position.top
      groupModalConfig.position.bottom = "0px"
      groupModalConfig.position.left = "40px"
      groupModalConfig.width = (window.innerWidth - 40) + "px"
      groupModalConfig.height = (window.innerHeight - 20) + "px"
    }

    return groupModalConfig
  }

  /**
   * Initialise active group of the profil. 
   * Will opened it by default
   * @param group 
   */
  initialiseActiveGroup(group: Group, groups: Array<Group>) {

    let groupModalConfig = this.getActiveGroupConfig()

    this.groupDialog = this.dialog.open(ListGroupThematiqueComponent, {
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

  /**
   * Open or close group dialog
   */
  toggleGroupDialog() {
    const toggleGroupDialogButton: HTMLElement = (document.getElementsByClassName("toggle-group-dialog").item(0) as HTMLElement)

    // @ts-expect-error
    if (this.groupDialog._containerInstance._elementRef.nativeElement.parentElement.style.display == "none") {
      // @ts-expect-error
      this.groupDialog._containerInstance._elementRef.nativeElement.parentElement.style.display = "block"
      if (toggleGroupDialogButton) {
        toggleGroupDialogButton.style.left = "27px"
        if (CartoHelper.isMobile()) {
          toggleGroupDialogButton.style.left = "3px"

        }
        toggleGroupDialogButton.style.borderRadius = "10px 0px 0px 10px"
      }
    } else {
      // @ts-expect-error
      this.groupDialog._containerInstance._elementRef.nativeElement.parentElement.style.display = "none"
      if (toggleGroupDialogButton) {
        toggleGroupDialogButton.style.left = "0px"
        toggleGroupDialogButton.style.borderRadius = "0px 10px 10px 0px"
      }

    }
  }

  isGroupDialogOpen() {
    if (!this.groupDialog) {
      return true
    }
    // @ts-expect-error
    return this.groupDialog._containerInstance._elementRef.nativeElement.parentElement.style.display != "none"
  }

  setMapOrientationToNord() {
    const camera = this.instance.view.camera
    camera.rotateZ(0)
    const currentCameraPosition = camera.position.clone()
    const currentControlsTarget = this.controls.target.clone()
    const offset = new Vector3().subVectors(this.controls.target, camera.position);

    const target = new Vector3(0, 0, -1);
    // target.applyQuaternion(camera.quaternion);
    target.add(camera.position).add(offset);
    camera.position.add(offset)
    camera.position.z = currentCameraPosition.z

    this.controls.target.copy(target)

    this.controls.update()
    this.instance.notifyChange(camera)
  }

  /**
  * Get a menu from right menu
  * @param name string name of the menu
  * @return rightMenuInterface|undefined
  */
  getRightMenu(name: string): rightMenuInterface {
    return this.rightMenus.find((item) => item.name == name)
  }

  /**
   * Get the active right menu
   * @return rightMenuInterface
   */
  getRightMenuActive(): rightMenuInterface {
    return this.rightMenus.find((item) => item.active)
  }

  /**
 * Open right menu
 * @param name string
 */
  openRightMenu(name: string) {
    let menu = this.getRightMenu(name)
    if (menu.active) {
      // this.sidenavContainer.end.close()
      this.rightMenus.map(item => item.active = false)
      this.sidenavRight.nativeElement.style.width = "0px"
      this.sidenavRight.nativeElement.style.right = "0px"
    } else {
      // this.sidenavRight.nativeElement.style.width = "220px"
      this.sidenavRight.nativeElement.style.right = "0px"
      this.sidenavRight.nativeElement.style.visibility = "visible"
      // this.sidenavContainer.end.open()
      this.rightMenus.map(item => item.active = false)
      menu.active = true
      this.tracker.trackEvent("open", menu.name)
    }
  }

  toggleGeolocation() { }

  getSystemPerformance(): "low" | "medium" | "high" {
    let performanceLevel: "low" | "medium" | "high" = "low"; // Default to low

    // Check the number of CPU cores
    const cores = navigator.hardwareConcurrency || 4;

    // Detect GPU power
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        console.log("GPU Detected:", gpu);
        if (gpu.toLowerCase().includes("nvidia") || gpu.toLowerCase().includes("amd")) {
          performanceLevel = "high";
        }
      }
    }

    // If CPU cores are high, assume better performance
    if (cores > 8) {
      performanceLevel = "high";
    } else if (cores > 4) {
      performanceLevel = "medium";
    }

    return performanceLevel;
  }


}

