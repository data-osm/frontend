import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injectable, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, combineLatest, concat, EMPTY, forkJoin, from, fromEvent, iif, interval, merge, Observable, of, ReplaySubject, Subject, Subscriber, timer } from 'rxjs';
import { catchError, debounceTime, delay, delayWhen, distinctUntilChanged, filter, map, mergeMap, retryWhen, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, toArray, withLatestFrom } from 'rxjs/operators';
import { CartoHelper } from '../../../helper/carto.helper';
import { ManageCompHelper } from '../../../helper/manage-comp.helper';
import { BaseMap } from '../../data/models/base-maps';
import { MapsService } from '../../data/services/maps.service';
import { ParametersService } from '../../data/services/parameters.service';
import {
  GeoJSON,
  getCenter,
} from '../../ol-module';
import { environment } from '../../../environments/environment';


import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

import { DataOsmLayersServiceService } from '../../services/data-som-layers-service/data-som-layers-service.service';

import { Group, Layer, RightMenuInterface } from '../../type/type';
import { ContextMenuComponent } from '../pages/context-menu/context-menu.component';
import { DescriptiveSheetData } from '../pages/descriptive-sheet/descriptive-sheet.component';
import { BaseMapsService } from '../../data/services/base-maps.service';
import { ListGroupThematiqueComponent } from '../pages/sidenav-left/sidenave-left-secondaire/list-group-thematique/list-group-thematique.component';
import { DirectionalLight, MathUtils, Vector3, PerspectiveCamera, Color, AmbientLight, Fog, Vector2, BasicShadowMap, DirectionalLightHelper, PCFSoftShadowMap, CameraHelper, Object3D, Mesh, BoxGeometry, Box3Helper, ShaderChunk, WebGLRendererParameters, WebGLRenderer, Scene, Camera, ReinhardToneMapping, SphereGeometry, MeshBasicMaterial, LinearToneMapping, NeutralToneMapping, CineonToneMapping, ACESFilmicToneMapping, AgXToneMapping, PCFShadowMap, SRGBColorSpace } from 'three/src/Three';
import Inspector from '@giro3d/cgiro3d/gui/Inspector.js';

import {
  Extent,
  Instance,
  Map,
  OrbitControls,
  Layer as GiroLayer,
  WmtsSource,
  Coordinates,
  MapLightingMode,
  ElevationLayer,
  BilFormat,
} from "../../giro-3d-module"





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
import { E } from '@angular/cdk/keycodes';

import { SunSystem } from '../../processing/sunSystem';
import Vec2 from '../../processing/math/vector2';
import Vec3 from '../../processing/math/vector3';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { BokehPass, RenderPass, SMAAPass, Sky, SSAOPass, FXAAShader, ShaderPass, OutputPass, TAARenderPass } from 'three/examples/jsm/Addons';

import { LightAndShadowSystem } from '../../processing/lightAndShadowSystem';


const extent = new Extent(
  'EPSG:3857',
  -20037508.342789244,
  20037508.342789244,
  -20048966.1,
  20048966.1,
);

Instance.registerCRS(
  "IGNF:WGS84G",
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
);
const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const temp2Vec3 = new Vector3()

const CAPABILITIES_URL = "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";
const ELEVATION_LAYER = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"
const enableTerrain = environment.enabledTerrain

@Injectable()
export abstract class AbstractProfilComponent implements OnInit {

  /**  
   * Map object 
  */
  map: Map = new Map({
    maxSubdivisionLevel: undefined, extent, terrain: enableTerrain, showOutline: false, backgroundColor: "gray", lighting: {
      enabled: true,
      mode: MapLightingMode.LightBased,
    },
  });
  instance: Instance = null
  controls: MapControls
  frameRenderTime: { [key: number]: FrameRenderTime } = {}

  onInitInstance: () => void;

  protected destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

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

  private groundTileProcessing: GroundTileProcessing

  sun: DirectionalLight

  sky: Sky
  sunSystem: SunSystem
  lightAndShadowSystem: LightAndShadowSystem

  eventsListener = {
    "groupsLoaded": new Subject<Array<Group>>(),
    "controlsAdded": new Subject<void>(),
    "instanceLoaded": new BehaviorSubject<boolean>(false),
  }
  /**
   * All menus of the right sidenav
   */
  rightMenus: Array<RightMenuInterface> = [
    { name: 'toc', active: false, enable: true, tooltip: 'toolpit_toc', title: 'table_of_contents', height: "100%" },
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data', height: "100%" },
    { name: 'edition', active: false, enable: false, tooltip: 'toolpit_tools', title: 'tools', height: "100%" },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing', height: "100%" },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend', height: "100%" },
    { name: 'scene_settings', active: false, enable: true, tooltip: 'toolpit_scene_settings', title: 'scene_settings', height: "200px" },
  ]

  effectComposer: EffectComposer
  objectsToUpdateAfterCameraUpdated: Subject<void>[] = []
  unrealBloomPass: UnrealBloomPass

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
    protected readonly tracker: MatomoTracker,
    private ngZone: NgZone,
  ) {
    Object3D.DEFAULT_UP.set(0, 0, 1);
    this.notifier = notifierService;




    const onInit: Subject<void> = new ReplaySubject<void>(1)

    this.onInitInstance = () => {
      onInit.next()
      onInit.pipe(
        take(1),
        switchMap(() => {
          return this.baseMapService.getCSRFToken()
        }),
        tap(() => {
          this.openRightMenu("scene_settings")

          this.initialiseProfilGroups()

          this.initialiseListAppRegions()

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
            switchMap(() => {
              return this.eventsListener.instanceLoaded.pipe(
                startWith(this.eventsListener.instanceLoaded.value),
                filter((instanceLoaded) => instanceLoaded),
                take(1),
                tap(() => {
                  this.init()
                  this.initialiseGroundTileProcessing()
                })
              )
            })
          ).subscribe()

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
              // return EMPTY
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
        })
      ).subscribe()

    }

    // Handle url query params when app is open




    this.eventsListener.controlsAdded.pipe(
      takeUntil(this.destroyed$),
      tap(() => {
        this.setConstructLayerFunction()
        this.initialiseBaseMaps()
      })
    ).subscribe()

    // Retrieve and display shared layers if exist, or default layers of the profil if exist


  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngOnDestroy() {
    this.destroyed$.next(true)
    this.destroyed$.complete()
  }

  renderFunction(scene: Scene, camera: Camera) {
    // this.instance.renderer.render(scene, camera);
    this.effectComposer.render();
  }

  onWindowResize() {
    this.effectComposer.setSize(window.innerWidth, window.innerHeight);
  }

  addSky() {
    this.sky = new Sky();
    this.sky.name = "sky"
    this.sky.frustumCulled = false
    const uniforms = this.sky.material.uniforms;
    uniforms.up.value = Object3D.DEFAULT_UP;
    this.sky.position.copy(this.instance.view.camera.position);

    this.sky.scale.setScalar(450000);

    this.sunSystem.registerUpdatableObject(uniforms.sunPosition.value)

    const parameter = {
      "toneMappingExposure": 0.85,
      "mieDirectionalG": 0.9997,
      "mieCoefficient": 0.009,
      "rayleigh": 0.487,
      "turbidity": 12.7,

    }

    uniforms.turbidity.value = parameter.turbidity;
    uniforms.rayleigh.value = parameter.rayleigh;
    uniforms.mieCoefficient.value = parameter.mieCoefficient;
    uniforms.mieDirectionalG.value = parameter.mieDirectionalG;
    this.sky.updateMatrix()
    this.sky.updateMatrixWorld(true)
    this.instance.scene.add(this.sky);

    const onUpdateSkyPosition: Subject<void> = new Subject<void>()
    onUpdateSkyPosition.pipe(
      tap(() => {
        this.sky.updateMatrixWorld(true)
        this.sky.position.copy(this.instance.view.camera.position);
      })
    ).subscribe()

    this.objectsToUpdateAfterCameraUpdated.push(onUpdateSkyPosition)
    onUpdateSkyPosition.next()


  }

  init() {
    const mapPosition = new Coordinates("EPSG:3857", this.instance.view.camera.position.x, this.instance.view.camera.position.y).as("EPSG:4326");
    this.sunSystem = new SunSystem(this.instance, new Vec2(mapPosition.latitude, mapPosition.longitude),)
    this.addSky()
    this.sunSystem.setSky(this.sky)

    // setTimeout(() => {
    const date = Date.now()
    // const date = new Date(Date.UTC(2025, 8 - 1, 24, 9, 0, 0))
    // const mapPosition = new Coordinates("EPSG:3857", this.instance.view.camera.position.x, this.instance.view.camera.position.y).as("EPSG:4326");
    this.sunSystem.update(new Vec2(mapPosition.latitude, mapPosition.longitude), date)
    this.addLights()


    fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
      takeUntil(this.destroyed$),
      tap(() => {
        // const date = new Date(Date.UTC(2025, 8 - 1, 20, 10, 0, 0))
        // const mapPosition = new Coordinates("EPSG:3857", this.instance.view.camera.position.x, this.instance.view.camera.position.y).as("EPSG:4326");
        // this.sunSystem.update(new Vec2(mapPosition.latitude, mapPosition.longitude), date)
        for (let i = 0; i < this.objectsToUpdateAfterCameraUpdated.length; i++) {
          this.objectsToUpdateAfterCameraUpdated[i].next()
        }
      })
    ).subscribe()


    if (!environment.production) {
      const inspector = new Inspector("giro3d-inspector", this.instance)
      const params = {
        "mieDirectionalG": 0.9998,
        "mieCoefficient": 0.009,
        "rayleigh": 0.487,
        "turbidity": 12.7,
        "hours": 10,
        "strength": 0.05,
        "radius": 0.1,
        "threshold": 0.85,
        "toneMappingExposure": 1,
        "toneMapping": ReinhardToneMapping,
        "maxFar": 1000,
        "shadowMapSize": 1024 * 2,
        update: () => {
          // this.lightAndShadowSystem._update();
          this.lightAndShadowSystem.csmHelper.update();
          // this.updateSunPositionAndTarget(this.instance.view.camera as PerspectiveCamera)

        }
      }
      inspector.gui.add(params, 'update').name('Update csm');
      inspector.gui.add(this.lightAndShadowSystem.csm, 'lightIntensity', 0, 15, 1).name('lightIntensity').onChange((value) => {
        this.lightAndShadowSystem.csm.lightIntensity = value
        this.lightAndShadowSystem.csm.update();
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'shadowMapSize', 512, 1024 * 4, 256).name('shadowMapSize').onChange((value) => {
        this.lightAndShadowSystem.csm.shadowMapSize = value
        this.lightAndShadowSystem.csm.update();
        this.lightAndShadowSystem.csm.updateFrustums();
        this.instance.notifyChange()
      })
      inspector.gui.add(this.lightAndShadowSystem.csm, 'maxFar', 100, 6000, 200).name('maxFar').onChange((value) => {
        this.lightAndShadowSystem.csm.maxFar = value
        this.lightAndShadowSystem.csm.update();
        this.lightAndShadowSystem.csm.updateFrustums();
        this.instance.notifyChange()
      })
      inspector.gui.add(this.lightAndShadowSystem.csm, 'shadowBias', -2, 2, 0.00001).name('shadowBias').onChange((value) => {
        this.lightAndShadowSystem.csm.shadowBias = value
        this.lightAndShadowSystem.csm.update();
        this.lightAndShadowSystem.csm.updateFrustums();
        this.instance.notifyChange()
      })
      inspector.gui.add(this.lightAndShadowSystem.csm, 'shadowNormalBias', -5, 5, 0.001).name('shadowNormalBias').onChange((value) => {
        this.lightAndShadowSystem.csm.shadowNormalBias = value
        this.lightAndShadowSystem.csm.update();
        this.lightAndShadowSystem.csm.updateFrustums();
        this.instance.notifyChange()
      })
      inspector.gui.add(this.lightAndShadowSystem.csm, 'lightMargin', 100, 4000, 50).name('lightMargin').onChange((value) => {
        this.lightAndShadowSystem.csm.lightMargin = value
        this.lightAndShadowSystem.csm.update();
        this.lightAndShadowSystem.csm.updateFrustums();
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'hours', 0, 24, 1).name('hours').onChange((hours) => {
        const date = new Date(Date.UTC(2025, 8 - 1, 24, hours, 0, 0))
        const mapPosition = new Coordinates("EPSG:3857", this.instance.view.camera.position.x, this.instance.view.camera.position.y).as("EPSG:4326");
        this.sunSystem.update(new Vec2(mapPosition.latitude, mapPosition.longitude), date)
        this.lightAndShadowSystem.update()
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'mieDirectionalG', 0, 1, 0.0001).name('mieDirectionalG').onChange((value) => {
        this.sky.material.uniforms.mieDirectionalG.value = value;
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'mieCoefficient', 0.01, 0.1, 0.0001).name('mieCoefficient').onChange((value) => {
        this.sky.material.uniforms.mieCoefficient.value = value;
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'rayleigh', 0, 1, 0.01).name('rayleigh').onChange((value) => {
        this.sky.material.uniforms.rayleigh.value = value;
        this.instance.notifyChange()
      })
      inspector.gui.add(params, 'turbidity', 0, 30, 1).name('turbidity').onChange((value) => {
        this.sky.material.uniforms.turbidity.value = value;
        this.instance.notifyChange()
      })

      inspector.gui.add(this.unrealBloomPass, 'strength', 0, 1, 0.01).name('strength').onChange((value) => {
        this.unrealBloomPass.strength = value
        this.instance.notifyChange()
      })

      inspector.gui.add(this.unrealBloomPass, 'radius', 0, 1, 0.01).name('radius').onChange((value) => {
        this.unrealBloomPass.radius = value
        this.instance.notifyChange()
      })

      inspector.gui.add(this.unrealBloomPass, 'threshold', 0, 1, 0.001).name('threshold').onChange((value) => {
        this.unrealBloomPass.threshold = value
        this.instance.notifyChange()
      })
    }



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
        antialias: this.getSystemPerformance() == "high" ? true : false,
      },
      renderFunction: this.renderFunction.bind(this)
    })
    this.instance.add(this.map);
    this.eventsListener.instanceLoaded.next(true)
    // this.map.receiveShadow = true;

    // We prevent Firefox effect : Firefox sometimes create an ghost image
    // when one drag the map
    const canvas = this.instance.renderer.domElement;
    canvas.setAttribute('draggable', 'false');
    canvas.addEventListener('dragstart', e => e.preventDefault());

    canvas.style.userSelect = 'none';
    // @ts-expect-error
    canvas.style.MozUserSelect = 'none';  // Firefox
    // @ts-expect-error
    canvas.style.WebkitUserSelect = 'none';
    canvas.style.touchAction = 'none';




    // Background of the scene
    const scene = this.instance.scene
    scene.background = new Color().setHSL(0.6, 1, 0.6);
    scene.fog = new Fog(0x2f3640, 5, 8000);

    this.updateCompassRotation()

    if (enableTerrain) {
      this.addTerrain()
    }




    this.effectComposer = new EffectComposer(this.instance.renderer);
    this.effectComposer.setSize(mapDomElement.nativeElement.clientWidth, mapDomElement.nativeElement.clientHeight);


    const renderPass = new RenderPass(this.instance.scene, this.instance.view.camera);
    this.unrealBloomPass = new UnrealBloomPass(new Vector2(mapDomElement.nativeElement.clientWidth / 2, mapDomElement.nativeElement.clientHeight / 2), 0.05, 0.1, 0.85)
    this.instance.renderer.toneMapping = NeutralToneMapping
    this.instance.renderer.toneMappingExposure = 1
    this.effectComposer.addPass(renderPass);

    // const fxaa = new ShaderPass(FXAAShader);
    // fxaa.material.uniforms['resolution'].value.x = 1 / (mapDomElement.nativeElement.offsetWidth * 1);
    // fxaa.material.uniforms['resolution'].value.y = 1 / (mapDomElement.nativeElement.offsetHeight * 1);

    const taa = new TAARenderPass(scene, this.instance.view.camera, "#FFFFFF");
    taa.sampleLevel = 1;

    const smaa = new SMAAPass(mapDomElement.nativeElement.clientWidth, mapDomElement.nativeElement.clientHeight);

    this.effectComposer.addPass(this.unrealBloomPass);
    // this.effectComposer.addPass(fxaa);
    this.effectComposer.addPass(smaa);
    this.effectComposer.addPass(new OutputPass());

    const resize$ = fromEvent(window, 'resize', { passive: true }).pipe(
      startWith(null),
      map(() => ({ width: window.innerWidth, height: window.innerHeight })),
      debounceTime(100),
      distinctUntilChanged((a, b) => a.width === b.width && a.height === b.height),
      // cache latest value for late subscribers
      shareReplay({ bufferSize: 1, refCount: true }),
      tap(({ width, height }) => {
        this.onWindowResize();
      })
    ).subscribe()


    this.instance.renderer.shadowMap.enabled = true;
    this.instance.renderer.shadowMap.type = PCFSoftShadowMap;
    // this.instance.renderer.setPixelRatio(1);
    // Enable shader errors in Dev
    if (!environment.production) {
      this.instance.renderer.debug.checkShaderErrors = true
    }







  }

  addTerrain() {
    const noDataValue = -1000;
    WmtsSource.fromCapabilities(CAPABILITIES_URL, {
      layer: ELEVATION_LAYER,
      format: new BilFormat(),
      noDataValue,
    })
      .then((elevationWmts) => {
        this.map.addLayer(
          new ElevationLayer({
            extent: this.map.extent,
            minmax: { min: 0, max: 5000 },
            resolutionFactor: 1 / 8,
            preloadImages: false,
            noDataOptions: {
              replaceNoData: false,
            },
            // colorMap: new ColorMap({
            //   colors: makeColorRamp("bathymetry"),
            //   min: 500,
            //   max: 1800,
            // }),
            source: elevationWmts,
          }),
        );
      })
      .catch(console.error);
  }

  registerNewRenderTime(frame: number, render_time: number) {
    this.getOrCreateFrameRenderTime(this.frameRenderTime, frame).render_time = render_time


  }

  registerNewTotalRenderTime(frame: number, total_render_time: number) {
    this.getOrCreateFrameRenderTime(this.frameRenderTime, frame).total_render_time = total_render_time

    if (Object.keys(this.frameRenderTime).length >= 50) {
      const layers = this.dataOsmLayersService.groupsLayerInMap.map((layer) => {
        return { layer_id: layer.layer.layer_id, layer_name: layer.layer.name }
      })
      // const layers = new CartoHelper(this.map).getAllLayersInToc().
      //   filter((layerProp) => layerProp.type_layer == 'geosmCatalogue')
      //   .filter((layerProp, index, self) => {
      //     /**
      //      * unique layer ^^
      //      */
      //     return self.map((item) => item.properties.couche_id + item.properties['type']).indexOf(layerProp.properties.couche_id + layerProp.properties['type']) === index;

      //   }).filter((layerProp) => layerProp.properties["type"] == "couche").map((layerProp) => {

      //     return { "layer_id": layerProp.properties["couche_id"], "layer_name": layerProp.nom }
      //   })

      // if (mapExtent == undefined) {
      //   return
      // }
      const mapExtent = [0, 0, 0, 0]
      const mapSize = new Vec2(0, 0)
      this.parametersService.logRenderTimePerFrame(this.frameRenderTime, layers.map((layer) => layer.layer_id), layers.map((layer) => layer.layer_name), Vec2.toArray(mapSize), mapExtent.join(","), window.location.href).pipe(take(1)).subscribe()
      this.frameRenderTime = {}
    }
  }

  addStats() {


    let updateStart = (performance || Date).now(), renderStart = updateStart;

    // Enable Stats in DEv mode

    if (!environment.production || (this.parametersService.map_id == 4 || this.parametersService.map_id == 15)) {
      // const inspector = new Inspector("giro3d-inspector", this.instance)

      // inspector.folders.filter((f) => f instanceof ProcessingInspector).map((f) => {

      //   f["charts"].forEach((c) => {
      //     if (c instanceof FrameDuration == false) {
      //       c.dispose()
      //     } else {
      //       f.gui.open()
      //       c.gui.open()
      //     }
      //   })
      // })
      // inspector.folders.filter((f) => (f instanceof ProcessingInspector == false) && f instanceof DrawToolPanel == false).map((f) => {
      //   f.dispose()
      // })

      var stats = new Stats();
      // We prefer to not use FPS, but the number of seconds to draw a frame (SecondPerFrame) 
      // See http://www.opengl-tutorial.org/fr/miscellaneous/an-fps-counter/

      stats.showPanel(1);
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
    target_position.setZ(0)
    const camera = this.instance.view.camera as PerspectiveCamera

    this.instance.view.camera.position.set(position.x, position.y, position.z);
    // const lookAt = new Vector3(position.x, position.y + 1, 50);
    this.instance.view.camera.lookAt(target_position);

    camera.updateProjectionMatrix();
    this.controls = new MapControls(this.instance.view.camera, this.instance.domElement);
    // this.controls.maxPolarAngle = Math.PI / 2 - (Math.PI / 10)
    this.controls.maxPolarAngle = Math.PI / 2 - MathUtils.degToRad(2)
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.zoomToCursor = true
    this.controls.target.copy(target_position);
    this.controls.saveState();
    // this.controls.target.set(0, 0, 0)
    this.instance.view.setControls(this.controls);
    this.controls.update()
    this.eventsListener.controlsAdded.next()

  }

  addLights() {

    // let parisPov = "260354.7,6252644.5,301.2,259689,6252821.8,0"
    // const center = getCenter(this.parametersService.projectPolygon.getGeometry().getExtent())
    // const center = [260354.7, 6252644.5]
    // this.sun = new DirectionalLight('#ff00ff', 20);
    // this.sun = new DirectionalLight('#white', 15);
    // this.sun.updateMatrixWorld(true);
    // this.sun.name = "Sun light"
    // this.sun.target.name = "Sun light target"

    // this.sun.shadow.bias = -0.0001;
    // this.sun.shadow.normalBias = 1
    // this.sun.shadow.radius = 0
    // this.sun.shadow.mapSize.width = 1024 * 1
    // this.sun.shadow.mapSize.height = 1024 * 1
    // const shadowCamera = this.sun.shadow.camera;
    // const d = 1000; // demi-largeur du volume d’ombre en unités de ta scène
    // shadowCamera.left = -d;
    // shadowCamera.right = d;
    // shadowCamera.top = d;
    // shadowCamera.bottom = -d;

    // this.instance.add(this.sun);
    // this.instance.add(this.sun.target);


    // // this.map.castShadow = true;

    // this.sun.castShadow = true;

    // const helper = new DirectionalLightHelper(this.sun, 5, "white");
    // helper.name = "Sun light helper"
    // this.instance.add(helper);

    // const camera = this.instance.view.camera
    // const camHelper = new CameraHelper(shadowCamera);
    // camHelper.name = "Sun light camera helper"
    // shadowCamera.far = 3000
    // shadowCamera.near = 1
    // shadowCamera.updateProjectionMatrix();

    this.lightAndShadowSystem = new LightAndShadowSystem(this.map, this.instance, this.sunSystem)
    const onUpdateSunPositionAfterCameraUpdate = new Subject<void>()
    onUpdateSunPositionAfterCameraUpdate.pipe(debounceTime(1000)).subscribe(() => {
      this.lightAndShadowSystem.update()
      // this.updateSunPositionAndTarget(this.instance.view.camera as PerspectiveCamera)
      // helper.update();
      // camHelper.update();
    })
    this.objectsToUpdateAfterCameraUpdated.push(onUpdateSunPositionAfterCameraUpdate)


    // setTimeout(() => {
    //   this.updateSunPositionAndTarget(this.instance.view.camera as PerspectiveCamera)
    //   setTimeout(() => {

    //     helper.update();
    //     camHelper.update();
    //   }, 1000);
    // }, 1000);




    // this.instance.addEventListener("before-render", (e) => {
    //   this.sun.target.updateMatrixWorld();
    //   shadowCamera.updateProjectionMatrix();
    //   // console.log(camera.position, camera.matrix)
    //   // shadowCamera.far = camera.far
    //   // shadowCamera.near = camera.near
    // helper.update();
    // camHelper.update();
    // })


    // const inspector = new Inspector("giro3d-inspector", this.instance)
    // const params = {
    //   "cameraFar": 3000,
    //   "cameraNear": 1,
    //   "lightIntensity": 2,
    //   "bias": 0.0001,
    //   update: () => {
    //     this.updateSunPositionAndTarget(this.instance.view.camera as PerspectiveCamera)
    //     helper.update();
    //     camHelper.update();
    //   }
    // }
    // inspector.gui.add(params, 'update').name('Update light');
    // inspector.gui.add(params, 'cameraFar').min(1000).max(5000).step(10).name('Camera far').onChange((value) => {
    //   shadowCamera.far = value
    //   helper.update();
    //   camHelper.update();
    //   this.instance.notifyChange()
    // });
    // inspector.gui.add(params, 'cameraNear').min(1).max(3000).step(10).name('Camera near').onChange((value) => {
    //   shadowCamera.near = value
    //   helper.update();
    //   camHelper.update();
    //   this.instance.notifyChange()
    // });


    // inspector.gui.add(params, 'lightIntensity').min(0).max(20).step(1).name('light Intensity').onChange((value) => {
    //   this.sun.intensity = value
    //   helper.update();
    //   camHelper.update();
    //   this.instance.notifyChange()
    // });

    // inspector.gui.add(params, "bias").min(-0.000005).max(0.000005).step(0.000001).name('bias').onChange((value) => {
    //   this.sun.shadow.bias = value
    //   // helper.update();
    //   // camHelper.update();
    //   this.instance.notifyChange()
    // })

    // We can look below the floor, so let's light also a bit there

    // const sun2 = new DirectionalLight('#ffffff', 0.5);
    // sun2.position.set(0, 1, 1);
    // sun2.updateMatrixWorld();
    // this.instance.add(sun2);

    // ambient
    // const ambientLight = new AmbientLight(new Color().setRGB(1, 1, 1), 4);
    // ambientLight.up.set(0, 0, 1);
    // this.instance.add(ambientLight);

  }

  updateSunPositionAndTarget(camera: PerspectiveCamera) {

    let mapPosition: Coordinates
    let cameraPosition: Vector3
    try {
      const mapBoundingBox = CartoHelper.getVisibleTileBoundingBox(this.map)

      if (mapBoundingBox.isEmpty()) {
        throw new Error("Map bounding box is undefined when updating sun position")
      }

      mapBoundingBox.getCenter(tempVec3)
      mapBoundingBox.getSize(temp2Vec3)
      const mapCenter = new Coordinates("EPSG:3857", tempVec3.x, tempVec3.y);
      mapPosition = mapCenter.clone().as("EPSG:4326");
      cameraPosition = new Vector3(mapCenter.x, mapCenter.y, camera.position.z)
      const extentDimensions = temp2Vec3.clone().divideScalar(2)
      const shadowCamera = this.sun.shadow.camera;
      shadowCamera.left = -extentDimensions.x;
      shadowCamera.right = extentDimensions.x;
      shadowCamera.top = extentDimensions.y;
      shadowCamera.bottom = -extentDimensions.y;

    } catch (error) {
      cameraPosition = camera.position
      mapPosition = new Coordinates("EPSG:3857", cameraPosition.x, cameraPosition.y).as("EPSG:4326");
      console.error(error)
    }

    // const date = new Date(Date.UTC(2025, 8 - 1, 20, 17, 0, 0))

    const sunDir = this.sunSystem.sunDirection
    const target = cameraPosition.clone()
    target.setZ(0)
    // TODO : get the min z of the near plane of the camera, and add like 200 meters to have the real scalar
    const sunPosition = target.clone().addScaledVector(new Vector3(sunDir.x, sunDir.y, sunDir.z), 1000)
    this.sun.position.copy(sunPosition)
    this.sun.target.position.copy(target).setZ(0);

    this.sun.updateMatrixWorld(true);
    this.sun.target.updateMatrixWorld(true);


    this.instance.notifyChange()

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
    const onUpdateCompassRotation: Subject<void> = new Subject<void>()
    onUpdateCompassRotation.pipe(
      debounceTime(200),
      tap(() => {
        const compassButton: HTMLElement = (document.getElementsByClassName("compass").item(0) as HTMLElement)
        if (compassButton) {
          compassButton.style.rotate = MathUtils.radToDeg(this.instance.view.camera.rotation.z) + "deg"
        }
      })
    ).subscribe()

    this.objectsToUpdateAfterCameraUpdated.push(onUpdateCompassRotation)
  }

  /**
   * Update url when ever map moved or layer are add/remove
   */
  updateCurrentUrl() {
    const onUpdateCurrentUrl: Subject<void> = new Subject<void>()
    onUpdateCurrentUrl.pipe(
      debounceTime(500),
      tap(() => {
        this.shareServiceService.updateUrlWithPointOfView(this.map)
      })
    ).subscribe()
    this.objectsToUpdateAfterCameraUpdated.push(onUpdateCurrentUrl)

  }

  initialiseClickEvent() {

    const mousedown$ = fromEvent<MouseEvent>(this.instance.domElement, 'mousedown');
    const mousemove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseup$ = fromEvent<MouseEvent>(document, 'mouseup');
    const clickWithoutDrag$ = mousedown$
      .pipe(
        switchMap((startEvent) => {
          const startX = startEvent.clientX;
          const startY = startEvent.clientY;
          return mouseup$.pipe(
            takeUntil(mousemove$),
            map((endEvent) => {
              const dx = Math.abs(endEvent.clientX - startX);
              const dy = Math.abs(endEvent.clientY - startY);
              return { dx, dy };
            }),
            filter(({ dx, dy }) => dx < 5 || dy < 5), // seuil de tolérance
            map(() => startEvent)
          );
        })
      )

    clickWithoutDrag$.pipe(
      takeUntil(this.destroyed$),
      tap((e) => {
        let dataFromClickOnMaps: dataFromClickOnMapInterface[]
        try {
          dataFromClickOnMaps = new MapMousseEvents(this.map).onClicked(e)
        } catch (error) {
          console.error(error)
        }
        if (dataFromClickOnMaps != undefined && dataFromClickOnMaps.length > 0) {
          let sheetsData: DescriptiveSheetData[] = []
          for (let i = 0; i < dataFromClickOnMaps.length; i++) {
            const dataFromClickOnMap = dataFromClickOnMaps[i]

            const layer: GiroLayer | undefined = (dataFromClickOnMap.data.layers && dataFromClickOnMap.data.layers.length > 0) ? dataFromClickOnMap.data.layers[0] : undefined

            let sheetData: DescriptiveSheetData = {
              type: dataFromClickOnMap.data.descriptionSheetCapabilities,
              coordinates_3857: dataFromClickOnMap.data.coord,
              point: dataFromClickOnMap.data.point,
              layer_id: layer?.userData.properties["couche_id"] as number,
              map: this.map,
              feature: dataFromClickOnMap.data.feature,
              layer: layer,
              object: dataFromClickOnMap.data.object
            }
            sheetsData.push(sheetData)
          }

          this.manageCompHelper.openDescriptiveSheetModal(sheetsData, [])

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
    this.ngZone.runOutsideAngular(() => {
      this.groundTileProcessing = new GroundTileProcessing(this.map, this.parametersService, this.sunSystem, this.lightAndShadowSystem.csm)
    });

  }

  updateGroundTilesVisibility(visibility: boolean) {

    this.groundTileProcessing.updateGroundTilesVisibility(visibility)
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
        this.addStats()

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
              this.eventsListener.groupsLoaded.next(groups)
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
  * @return RightMenuInterface|undefined
  */
  getRightMenu(name: string): RightMenuInterface {
    return this.rightMenus.find((item) => item.name == name)
  }

  /**
   * Get the active right menu
   * @return RightMenuInterface
   */
  getRightMenuActive(): RightMenuInterface {
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
      this.sidenavRight.nativeElement.style.height = menu.height
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
