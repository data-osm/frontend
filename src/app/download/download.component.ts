import { HttpErrorResponse } from '@angular/common/http';
import { Component, ComponentRef, ElementRef, EmbeddedViewRef, Input, OnInit, SimpleChanges, ViewChild, ComponentFactoryResolver, Injector, ApplicationRef, Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Map, Overlay } from 'ol';
import { ObjectEvent } from 'ol/Object';
import { Style, Stroke, Fill } from 'ol/style';
import { EMPTY, iif, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CartoHelper } from '../../helper/carto.helper';
import { FeatureToDownload } from '../data/models/download';
import { AdminBoundaryRespone } from '../data/models/parameters';
import { DownloadService } from '../data/services/download.service';
import { ParametersService } from '../data/services/parameters.service';
import { VectorLayer, VectorSource, GeoJSON, getCenter, OverlayPositioning } from '../ol-module';
import { DataOsmLayersServiceService } from '../services/data-som-layers-service/data-som-layers-service.service';
import { fromOpenLayerEvent } from '../shared/class/fromOpenLayerEvent';
import { Layer } from '../type/type';
import { ChartOverlayComponent } from './pages/chart-overlay/chart-overlay.component';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
export class DownloadComponent implements OnInit {
  onInitInstance: () => void
  onCountFeatureInstance: () => void

  @Input() map: Map
  @ViewChild('downlod_list_overlays') downlodListOverlays: ElementRef;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  layersArrayControl: FormArray = this.formBuilder.array([], [Validators.required])
  fromDownload: FormGroup = this.formBuilder.group({
    layers: this.layersArrayControl,
    adminBoundary: new FormControl(undefined),
    exportAll: new FormControl(false, [Validators.required])
  })
  constructor(
    public formBuilder: FormBuilder,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    public parameterService: ParametersService,
    public downloadService: DownloadService,
    public notifier: NotifierService,
    public translate: TranslateService,
    public manipulateComponent: ManipulateComponent,
    private elementRef: ElementRef
  ) {
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      console.log(new CartoHelper(this.map).getAllLayersInToc(), 'onInitInstance DownloadComponent')
      this.layersArrayControl.clear()
      new CartoHelper(this.map).getAllLayersInToc()
        .filter((layerProp) => layerProp.type_layer == 'geosmCatalogue' && layerProp.properties['type'] == 'couche')
        .filter((value, index, self) => {
          /**
           * unique layer ^^
           */
          return self.map((item) => item.properties['couche_id'] + item.properties['type']).indexOf(value.properties['couche_id'] + value.properties['type']) === index;

        })
        .map((layerProp) => {
          let layer = this.dataOsmLayersServiceService.getLayerInMap(layerProp.properties['couche_id']).layer
          this.layersArrayControl.push(new FormControl(layer))
          return layer
        })

      if (this.layersArrayControl.length == 0) {
        this.layersArrayControl.push(new FormControl())
      }

    }

  
    const onCountFeature: Subject<void> = new Subject<void>()

    this.onCountFeatureInstance = () => {
      onCountFeature.next()
    }

    onCountFeature.pipe(
      // filter(() => this.fromDownload.valid),
      mergeMap(() => {
        this.parameterService.parameter.extent
        let adminBoundarySelected: AdminBoundaryRespone = this.fromDownload.get('adminBoundary').value;
        let admin_boundary_id:number = undefined
        let table_id:number = undefined
        try {
          admin_boundary_id = adminBoundarySelected.adminBoundary.admin_boundary_id
          table_id = adminBoundarySelected.feature.table_id
        } catch (error) {
          
        }
        return iif(
          ()=>this.fromDownload.get('exportAll').value === false,
          this.downloadService.countFeaturesInAdminBoundary(this.layersArrayControl.controls.map((control) => control.value.layer_id), admin_boundary_id, table_id).
          pipe(
            switchMap((countFeatures)=>{
              return this.parameterService.getAdminBoundaryFeature(admin_boundary_id, table_id).pipe(
                catchError((error: HttpErrorResponse) => {
                  this.notifier.notify("error", this.translate.instant('dowload_data.error_fetching_adminboundary'));
                  return EMPTY
                }),
                map((adminBoundaryFeature)=>{
                  let feature = new GeoJSON().readFeature(adminBoundaryFeature.geometry);
                  return {countFeatures:countFeatures,feature:feature, admin_boundary_id:admin_boundary_id, table_id:table_id, name:adminBoundarySelected.feature.name}
                })
              )
            })
          ),
          this.downloadService.countFeaturesInAdminBoundary(this.layersArrayControl.controls.map((control) => control.value.layer_id)).pipe(
            map((countFeatures)=>{
              return {countFeatures:countFeatures,feature:this.parameterService.projectPolygon, admin_boundary_id:undefined, table_id:undefined,name:"Export total"}
            })
          ),
        )
      }),
      catchError((error: HttpErrorResponse) => {
        this.notifier.notify("error", this.translate.instant('dowload_data.error_count'));
        return EMPTY
      }),
      map((parameters)=>{
        let countFeatures = parameters.countFeatures
        let feature = parameters.feature
        let layerExport = new VectorLayer({
          source: new VectorSource(),
          style: new Style({
            stroke: new Stroke({
              color: "#000",
              width: 2,
            }),
            fill: new Fill({
              color: environment.primaryColor,
            }),
          }),
          updateWhileAnimating: true,
        })
        layerExport.set('tocCapabilities', {
          opacity: false,
          metadata: false,
          share: false
        })
        layerExport.set('nom', 'exportData')
        layerExport.set('type_layer', 'exportData')
        layerExport.set('inToc', false)
        layerExport.setZIndex(1000)

        layerExport.getSource().addFeature(feature)

        let cartoClass = new CartoHelper(this.map)
        cartoClass.addLayerToMap(layerExport)


        cartoClass.map.getView().fit(layerExport.getSource().getExtent(), { size: cartoClass.map.getSize(), duration: 1000 })

        /** construct and add overlay with the diagram on the map */
        return Object.assign(parameters,{center:getCenter(layerExport.getSource().getExtent())}) ;
      }),
      tap((parameters) => {
        let countFeatures = parameters.countFeatures
        let feature = parameters.feature
        let center = parameters.center

        let numbers = countFeatures.map((countFeature) => countFeature.count)
        let labels = countFeatures.map((countFeature) => countFeature.layer_name + ': ' + countFeature.vector.name + " (" + countFeature.count + ") ")

        var dynamicColors = function () {
          var r = Math.floor(Math.random() * 255);
          var g = Math.floor(Math.random() * 255);
          var b = Math.floor(Math.random() * 255);
          return "rgb(" + r + "," + g + "," + b + ")";
        };
        var coloR = [];
        for (var i in numbers) {
          coloR.push(dynamicColors());
        }

        let chartConfig =
        {
          type: "pie",
          scaleFontColor: "red",
          data: {
            labels: labels,
            datasets: [
              {
                data: numbers,
                backgroundColor: coloR,
                borderColor: "rgba(200, 200, 200, 0.75)",
                hoverBorderColor: "rgba(200, 200, 200, 1)",
              },
            ],
          },
          options: {
            title: {
              display: true,
              text: parameters.name,
              fontColor: "#fff",
              fontSize: 16,
              position: "top",
            },
            legend: {
              display: true,
              labels: {
                fontColor: "#fff",
                fontSize: 14,
              },
            },
            scales: {
              xAxes: [
                {
                  display: false,
                  ticks: {
                    fontColor: "Black",
                  },
                },
              ],
              yAxes: [
                {
                  display: false,
                },
              ],
            },
          }

        }

        console.log(this.layersArrayControl.controls)
        let idOverlay = makeid()
        let elementChart = this.manipulateComponent.createComponent(ChartOverlayComponent, {
          'chartConnfiguration': chartConfig, 'close': function () {
            var cartoClass = new CartoHelper(this.map)
            var overlay = cartoClass.map.getOverlayById(idOverlay)
            cartoClass.map.removeOverlay(overlay)

            cartoClass.getLayerByName('exportData').slice().map((element) => { cartoClass.map.removeLayer(element) })

          }.bind(this), 'admin_boundary_id': parameters.admin_boundary_id,'name': parameters.name, 'table_id': parameters.table_id, 'countFeatures': countFeatures.map((feature) => { return Object.assign(feature, { layer: this.layersArrayControl.controls.find((control) => control.value.layer_id === feature.layer_id).value as Layer }) })
        })

        this.manipulateComponent.appendComponent(elementChart, this.downlodListOverlays.nativeElement)

        let overlayExport = new Overlay({
          position: center,
          positioning: OverlayPositioning.CENTER_CENTER,
          element: elementChart.location.nativeElement,
          id: idOverlay
        });

        this.map.addOverlay(overlayExport);

      })

    ).subscribe()



  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.map) {
      if (this.map) {
        fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(), 'propertychange').pipe(
          takeUntil(this.destroyed$),
          // filter(() => this.elementRef.nativeElement.offsetParent === null),
          tap(() => {
            this.onInitInstance()
          })
        ).subscribe()

      }
    }
  }

  ngOnDestroy() {
    this.destroyed$.next()
    this.destroyed$.complete()
  }

}
@Injectable({
  providedIn: 'root'
})
export class ManipulateComponent {
  constructor(
    public componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector,
    private appRef: ApplicationRef,
  ) {

  }

  /** 
* Create a component with attributes
* @see https://gist.github.com/reed-lawrence/1f6b7c328ad3886e60dc2b0adcf75a97
* @param component any
* @param componentProps object
*/
  createComponent(component: any, componentProps?: object) {
    // 1. Create a component reference from the component
    const componentRef = this.componentFactoryResolver
      .resolveComponentFactory(component)
      .create(this.injector);

    if (componentProps && typeof componentRef.instance === 'object') {
      Object.assign(componentRef.instance as object, componentProps);
    }
    return componentRef;
  }

  /**
 * append a component create dynnamically to an Element
 * @see https://gist.github.com/reed-lawrence/1f6b7c328ad3886e60dc2b0adcf75a97
 * @param componentRef ComponentRef<unknown>
 * @param appendTo Element
 */
  appendComponent(componentRef: ComponentRef<unknown>, appendTo: Element) {
    // 2. Attach component to the appRef so that it's inside the ng component tree
    this.appRef.attachView(componentRef.hostView);

    // 3. Get DOM element from component
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>)
      .rootNodes[0] as HTMLElement;

    // 4. Append DOM element to the body
    appendTo.appendChild(domElem);

    return;
  }

}


/**
  * generate random id
  * @return string
  */
export function makeid(): string {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}