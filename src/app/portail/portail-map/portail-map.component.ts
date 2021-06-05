import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavContainer } from '@angular/material/sidenav';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { ObjectEvent } from 'ol/Object';
import { combineLatest, concat, EMPTY, forkJoin, iif, merge, Observable, of, ReplaySubject, Subject, Subscriber } from 'rxjs';
import { catchError, debounceTime, map, mergeMap, startWith, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
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
  Coordinate,
  Point,
} from '../../ol-module';
import { DataOsmLayersServiceService } from '../../services/data-som-layers-service/data-som-layers-service.service';
import { fromOpenLayerEvent } from '../../shared/class/fromOpenLayerEvent';

import { Group, rightMenuInterface } from '../../type/type';
import { ContextMenuComponent } from '../pages/context-menu/context-menu.component';
import { DescriptiveSheetData } from '../pages/descriptive-sheet/descriptive-sheet.component';



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

    fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(), 'propertychange').pipe(
      startWith(undefined),
      tap(() => {
        this.layersInToc = new CartoHelper(this.map).getAllLayersInToc().
          filter((layerProp) => layerProp.type_layer == 'geosmCatalogue')
          .filter((value, index, self) => {
            /**
             * unique layer ^^
             */
            return self.map((item) => item.properties['couche_id'] + item.properties['type']).indexOf(value.properties['couche_id'] + value.properties['type']) === index;

          })
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }



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

  groups$: Observable<Array<Group>>

  private readonly notifier: NotifierService;

  constructor(
    public ngZone: NgZone,
    public parametersService: ParametersService,
    public mapsService: MapsService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog: MatDialog,
    public manageCompHelper: ManageCompHelper,
    public activatedRoute: ActivatedRoute,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    public router:Router
  ) {
    this.notifier = notifierService;


    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    onInit.pipe(
      take(1),
      switchMap(() => {
        return this.parametersService.getAppExtent(true).pipe(
          catchError((error: HttpErrorResponse) => {
            this.notifier.notify("error", this.translate.instant('portail.error_loading.extent'));
            return EMPTY
          }),
          tap((value) => {

            let shadowMap = new CartoHelper(this.map).constructShadowLayer(value.st_asgeojson)
            shadowMap.setZIndex(1000)
            this.map.addLayer(shadowMap)

            setTimeout(() => {
              this.map.getView().fit(
                [value.a, value.b, value.c, value.d],
                { 'size': this.map.getSize(), 'duration': 1000 }
              );
            }, 500);

          })
        )
      })
    ).subscribe()

    this.groups$ = merge(
      combineLatest(this.activatedRoute.queryParams, onInit).pipe(
        map(([params, a]) => params),
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
            of(parseInt(params['profil']))
          )
        ),
        switchMap((map_id) => {
          this.parametersService.map_id = map_id
          return this.mapsService.getAllGroupOfMap(map_id).pipe(
            catchError((error: HttpErrorResponse) => {
              this.notifier.notify("error", this.translate.instant('portail.error_loading.parameter'));
              this.router.navigateByUrl('/map').then(()=>{
                window.location.reload();
              })
              return EMPTY
            }),
            tap((groups)=>{
              if (groups.length ==0) {
                this.router.navigateByUrl('/map').then(()=>{
                  window.location.reload();
                })
              }
            })
          )
        })
      )
    )

    /**
    * Handle share parameters
    */
    combineLatest(this.activatedRoute.queryParams, this.groups$).pipe(
      takeUntil(this.destroyed$),
      switchMap((parameters) => {
        let params = parameters[0]
        let groups = parameters[1]
        if (params['pos']) {
          try {
            let positionData = params['pos'].split(',').map((u) => parseFloat(u))
            let shareCenter: Coordinate = [positionData[0], positionData[1]]

            var geom = new Point(Transform(shareCenter, 'EPSG:4326', 'EPSG:3857'))
            setTimeout(() => {
              new CartoHelper(this.map).fit_view(geom, parseFloat(positionData[2]))
            }, 2000);
          } catch (error) {

          }

        }
        if (params['layers']) {
          let shareParameters: Array<[number, number]> = params['layers'].split(';').map((item) => item.split(',').map((u) => parseInt(u)))
          let getLayers$ = shareParameters
            .filter((shareParam) => groups.find((group) => group.group_id === shareParam[1]) != undefined)
            .map((shareParam) => {
              let group = groups.find((group) => group.group_id === shareParam[1])
              return this.mapsService.getLayer(shareParam[0]).pipe(
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
            })

          return concat(...getLayers$).pipe(toArray())
        }
        return EMPTY
      }),
      tap((layers_groups) => {
        layers_groups.map((layer_group) => {
          this.dataOsmLayersServiceService.addLayer(layer_group.layer, this.map, layer_group.group)
        })
      })
    ).subscribe()

    fromOpenLayerEvent<MapBrowserEvent>(this.map, 'singleclick').pipe(
      takeUntil(this.destroyed$),
      tap((e) => {
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
              let sheetData: DescriptiveSheetData = {
                type: layerTopZindex.get('descriptionSheetCapabilities'),
                coordinates_3857: data.data.coord,
                layer_id: layerTopZindex.get('properties').couche_id,
                map: this.map,
                feature: data.data.feature,
                layer: layerTopZindex
              }
              this.manageCompHelper.openDescriptiveSheetModal(sheetData, [])
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

  ngOnDestroy() {
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

}