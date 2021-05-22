import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { ObjectEvent } from 'ol/Object';
import { EMPTY, merge, Observable, ReplaySubject, Subject, Subscriber } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { CartoHelper, dataFromClickOnMapInterface, layersInMap } from '../../../helper/carto.helper';
import { ManageCompHelper } from '../../../helper/manage-comp.helper';
import { BaseMap } from '../../data/models/base-maps';
import { MapsService } from '../../data/services/maps.service';
import { ParametersService } from '../../data/services/parameters.service';
import {
  Map,
  View,
  Attribution,
  LayerGroup,
  Feature,
  Transform,
  MapBrowserEvent,
  Pixel,
  OverlayPositioning,
  FeatureLike,
  unByKey,
} from '../../ol-module';
import { fromOpenLayerEvent } from '../../shared/class/fromOpenLayerEvent';

import { Group, rightMenuInterface } from '../../type/type';
import { ContextMenuComponent } from '../pages/context-menu/context-menu.component';
import { DescriptiveSheetComponent, DescriptiveSheetData } from '../pages/descriptive-sheet/descriptive-sheet.component';
import { SidenaveLeftSecondaireComponent } from '../pages/sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component';



@Component({
  selector: 'app-portail-map',
  templateUrl: './portail-map.component.html',
  styleUrls: ['./portail-map.component.scss']
})
export class PortailMapComponent implements OnInit {

  map = new Map({
    layers: [
      new LayerGroup({
        // "nom": 'group-layer-shadow',
      })
    ],
    view: new View({
      center: [0, 0],
      zoom: 4
    }),
    // controls: defaultControls({ attribution: false, zoom: false }).extend([attribution]),
    // controls: defaultControls({ attribution: true, zoom: false }),
  });

  onInitInstance: () => void;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * Context menu component of the app
   */
  @ViewChild(ContextMenuComponent, { static: true }) ContextMenuComp: ContextMenuComponent;

  /**
   * La sidenav
   */
  @ViewChild(MatSidenavContainer, { static: true }) sidenavContainer: MatSidenavContainer;

  @ViewChild('mapDiv') set myDiv(myDiv: ElementRef) {
    this.map.setTarget(myDiv.nativeElement)
    this.map.updateSize()
    this.map.addControl(CartoHelper.scaleControl('scaleline', 'scale-map'))
    this.map.addControl(CartoHelper.mousePositionControl('mouse-position-map'))

    fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(),'propertychange').pipe(
      startWith(undefined),
      tap(()=>{
        this.layersInToc = new CartoHelper(this.map).getAllLayersInToc().
        filter((layerProp)=>layerProp.type_layer =='geosmCatalogue' )
        .filter((value, index, self)=>{
          /**
           * unique layer ^^
           */
           return self.map((item)=>item.properties['couche_id']+item.properties['type']).indexOf(value.properties['couche_id']+value.properties['type']) === index;

        })
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  /**
   * Second component of the left sidenav On top of the first one:
   * It is use to show details of a group thematique or a group carte
   */
  @ViewChild(SidenaveLeftSecondaireComponent, { static: true }) SidenaveLeftSecondaireComp: SidenaveLeftSecondaireComponent

  /**
   * All menu of the rith sidenav
   */
  ritghtMenus: Array<rightMenuInterface> = [
    { name: 'toc', active: false, enable: true, tooltip: 'toolpit_toc', title: 'table_of_contents' },
    { name: 'download', active: false, enable: true, tooltip: 'toolpit_download_data', title: 'download_data' },
    { name: 'edition', active: false, enable: false, tooltip: 'toolpit_tools', title: 'tools' },
    { name: 'routing', active: false, enable: false, tooltip: 'toolpit_map_routing', title: 'map_routing' },
    { name: 'legend', active: false, enable: true, tooltip: 'toolpit_legend', title: 'legend' },
  ]

  /**
   * all the layer in the toc
   */
  layersInToc: Array<layersInMap> = []

  groups$:Observable<Array<Group>>

  private readonly notifier: NotifierService;

  constructor(
    public ngZone: NgZone,
    public parametersService:ParametersService,
    public mapsService:MapsService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog:MatDialog,
    public manageCompHelper:ManageCompHelper
  ) {
    this.notifier = notifierService;


    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    onInit.pipe(
      take(1),
      switchMap(()=>{
        return this.parametersService.getAppExtent(true).pipe(
          catchError((error: HttpErrorResponse) => {
            this.notifier.notify("error", this.translate.instant('portail.error_loading.extent') ) ;
            return EMPTY
          }),
          tap((value)=>{
            
            let shadowMap = new CartoHelper(this.map).constructShadowLayer(value.st_asgeojson)
            shadowMap.setZIndex(1000)
            this.map.addLayer(shadowMap)

            setTimeout(() => {
              this.map.getView().fit(
                [value.a,value.b,value.c,value.d],
                { 'size': this.map.getSize(), 'duration': 1000 }
              );
            }, 500);

          })
        )
      })
    ).subscribe()

    this.groups$ = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.parametersService.getParameters().pipe(
            catchError((error: HttpErrorResponse) => {
              this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter') ) ;
              return EMPTY
            }),
            switchMap((parameter)=>{
              return this.mapsService.getAllGroupOfMap(parameter.map.map_id).pipe(
                catchError((error: HttpErrorResponse) => {
                  this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter') ) ;
                  return EMPTY
                }),
              )
            })
          )
        })
      )
    )

    fromOpenLayerEvent<MapBrowserEvent>(this.map, 'singleclick').pipe(
      takeUntil(this.destroyed$),
      tap((e)=>{
        function compare(a, b) {
          if (a.getZIndex() < b.getZIndex()) {
            return 1;
          }
          if (a.getZIndex() > b.getZIndex()) {
            return -1;
          }
          return 0;
        }
        new CartoHelper(this.map).mapHasCliked(e, (data: dataFromClickOnMapInterface) => {
            if (data.type == 'raster') {
              var layers = data.data.layers.sort(compare);
              var layerTopZindex = layers.length > 0 ? layers[0] : undefined

              if (layerTopZindex) {
                let sheetData:DescriptiveSheetData ={
                  type:layerTopZindex.get('descriptionSheetCapabilities'),
                  coordinates_3857: data.data.coord,
                  layer_id:layerTopZindex.get('properties').couche_id,
                  map:this.map,
                  feature:data.data.feature,
                  layer:layerTopZindex
                }
               this.manageCompHelper.openDescriptiveSheetModal(sheetData,[])
              }

            } else if (data.type == 'clear') {

            } else if (data.type == 'vector') {
              var layers = data.data.layers.sort(compare);
              var layerTopZindex = layers.length > 0 ? layers[0] : undefined

              if (layerTopZindex) {
                // var descriptionSheetCapabilities = layerTopZindex.get('descriptionSheetCapabilities')
                // this.manageCompHelper.openDescriptiveSheet(descriptionSheetCapabilities, cartoHelperClass.constructAlyerInMap(layerTopZindex), data.data.coord, data.data.feature.getGeometry(), data.data.feature.getProperties())
              }
            }
          })

      })
    ).subscribe()



  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngAfterViewInit() {

  }

  ngOnDestroy(){
    this.destroyed$.next()
    this.destroyed$.complete()
  }

  /**
   * Get a menu from right menu
   * @param name string name of the menu
   * @return rightMenuInterface|undefined
   */
  getRightMenu(name: string): rightMenuInterface {
    return this.ritghtMenus.find((item) => item.name == name)
  }

  /**
   * Get the active right menu
   * @return rightMenuInterface
   */
  getRightMenuActive(): rightMenuInterface {
    return this.ritghtMenus.find((item) => item.active)
  }

  /**
   * Open right menu
   * @param name string
   */
  openRightMenu(name: string) {
    let menu = this.getRightMenu(name)
    if (menu.active) {
      this.sidenavContainer.end.close()
      this.ritghtMenus.map(item => item.active = false)
    } else {
      this.sidenavContainer.end.open()
      this.ritghtMenus.map(item => item.active = false)
      menu.active = true
    }
  }


  /**
   * Toggle geolocation
   * if the geolocation layer exist, the user is already located, if not we must geolocate him
   */
   toggleGeolocation() {
    let cartoHelpeClass = new CartoHelper(this.map)

    if (cartoHelpeClass.getLayerByName('user_position').length == 0) {
      cartoHelpeClass.geolocateUser()
    } else {
      let featurePosition = cartoHelpeClass.getLayerByName('user_position')[0].getSource().getFeatures()[0]
      cartoHelpeClass.fit_view(featurePosition.getGeometry(), 19)
    }
  }

  /**
   * Handle parameters of the app when opening with route /map
   */
  //  handleMapParamsUrl() {
  //   this.activatedRoute.queryParams.subscribe(params => {
  //     /** share of layers */
  //     if (params['layers']) {
  //       // verify if params pos is present in url param et zoomer dessus
  //       var layers = params['layers'].split(';')
  //       this.ShareServiceService.addLayersFromUrl(layers)

  //     }
  //     if (params['feature']) {
  //       var parametersShared = params['feature'].split(';')
  //       this.ShareServiceService.displayFeatureShared(parametersShared)
  //     }

  //     if(params['pos']){
  //       var positionData = params['pos'].split(',')
  //       this.ShareServiceService.zoomToSharePos(parseFloat(positionData[0]), parseFloat(positionData[1]), parseFloat(positionData[2]))
  //     }
  //   })
  // }

}