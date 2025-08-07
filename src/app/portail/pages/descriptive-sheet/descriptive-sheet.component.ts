import { Component, OnInit, Inject, SimpleChanges, OnChanges, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Group, Layer } from '../../../type/type';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { CartoHelper } from '../../../../helper/carto.helper';
// import { ManageCompHelper } from '../../../../helper/manage-comp.helper';
import { environment } from '../../../../environments/environment';
import { VectorLayer, Style, Fill, Stroke, CircleStyle, GeoJSON, Feature, Coordinate, ImageLayer, TileLayer, ImageWMS, getProjection } from '../../../ol-module';
import Geometry from 'ol/geom/Geometry';
import { concat, EMPTY, iif, Observable, of, ReplaySubject, Subject, timer } from 'rxjs';
import { catchError, debounceTime, delayWhen, filter, map, mergeMap, retryWhen, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
import { DataOsmLayersServiceService } from '../../../services/data-som-layers-service/data-som-layers-service.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { OsmSheetComponent } from './osm-sheet/osm-sheet.component';
import { boundingExtent } from 'ol/extent';
import { MatChipListbox, MatChipOption, MatChipSelectionChange } from '@angular/material/chips';
import {
  Extent,
  Instance,
  Map as Giro3DMap,
  Layer as giroLayer,
  ColorLayer,
  LayerUserData,
  VectorSource
} from "../../../giro-3d-module"

import { InstancedBufferGeometry, Group as ThreeGroup, Mesh, Object3DEventMap, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Quaternion, CircleGeometry, Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { fromInstanceGiroEvent, fromMapGiroEvent } from '../../../shared/class/fromGiroEvent';
import { manageDataHelper } from '../../../../helper/manage-data.helper';
import { MatomoTracker } from 'ngx-matomo-client';
/**
 * interface of the model to display a sheet properties
 */
export interface DescriptiveSheetData {
  /**
   * type of layer, 'osm' for osm layers
   */
  type?: string,
  /**
   * Data osm layer id
   */
  layer_id?: number
  /**
   * Featur user clicked on if exist
   */
  feature?: Feature,
  /**
   * layer user clicked on
   */
  layer?: giroLayer,
  map: Giro3DMap
  /**
   * Coordiante at pixel where the user clicked
   */
  coordinates_3857: Coordinate,
  point: Vector3
  object?: Object3D<Object3DEventMap>
  // getShareUrl?:(environment,ShareServiceService:ShareServiceService)=>string
}

export interface FeatureForSheet extends Feature {
  provider_style_id: number
  provider_vector_id: number;
  primary_key_field: string
}

export interface EntitySheet {
  feature: FeatureForSheet,
  data: DescriptiveSheetData,
  dataOsmLAyer: {
    group: Group;
    layer: Layer;
  }
}



@Component({
  selector: 'app-descriptive-sheet',
  templateUrl: './descriptive-sheet.component.html',
  styleUrls: ['./descriptive-sheet.component.scss']
})
/**
 * Dislplay different descriptive sheet
 * - osm type
 */
export class DescriptiveSheetComponent implements OnInit {

  public onInitInstance: () => void


  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  entities$: Observable<EntitySheet[]>

  environment = environment

  // OsmSheetComponent

  /**
 * extent of the current feature, if the user want to zoom on int
 */
  extent: Extent

  featureInfoIsLoading: boolean = false
  private instance: Instance
  selectedEntity: EntitySheet = null;
  selectedEntityKey: number = null;

  map: Giro3DMap


  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  HighlightLayer: ColorLayer = new ColorLayer({
    name: "HighlightLayer",
    source: new VectorSource({
      data: [],
      dataProjection: 'EPSG:3857',

      // format: new GeoJSON(),
      // style: null,
      style: (feature) => {
        if (feature.getGeometry().getType() == "Point" || feature.getGeometry().getType() == "MultiPoint") {
          return null
        }
        var textLabel;
        var textStyle = {
          font: "15px Calibri,sans-serif",
          fill: new Fill({ color: "#000" }),
          stroke: new Stroke({ color: "#000", width: 1 }),
          padding: [10, 10, 10, 10],
          offsetX: 0,
          offsetY: 0,
        }
        if (feature.get('textLabel')) {
          textLabel = feature.get('textLabel')
          textStyle['text'] = textLabel
          if (feature.getGeometry().getType() == 'Point') {
            textStyle.offsetY = 40
            textStyle['backgroundFill'] = new Fill({ color: "#fff" })
          }
        }

        var color = '#FFEB3B'
        return new Style({
          fill: new Fill({
            color: [manageDataHelper.hexToRgb(color).r, manageDataHelper.hexToRgb(color).g, manageDataHelper.hexToRgb(color).b, 0.5]
          }),
          stroke: new Stroke({
            color: '#04458F',
            width: 6
          }),
          // image: new Icon({
          //   scale: 0.7,
          //   src: '/assets/icones/marker-search.png'
          // }),
          // text: new Text(textStyle)
        })
      },
    }),
  });



  onChipSelectionChange(event: MatChipSelectionChange, entity: EntitySheet) {
    if (event.selected) {
      this.selectedEntityKey = null
      setTimeout(() => {

        this.tracker.trackEvent("open", "feature", entity.data.type)
        this.selectedEntity = entity
        this.selectedEntityKey = Math.random()
        this.cdRef.detectChanges();
      })
    }
  }


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DescriptiveSheetData[],
    public dialogRef: MatDialogRef<DescriptiveSheetComponent>,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    protected readonly tracker: MatomoTracker,
    // public manageCompHelper:ManageCompHelper,
    // public ShareServiceService:ShareServiceService
  ) {

    if (this.data == undefined || this.data.length == 0) {
      this.closeModal()
    }
    this.map = this.data[0].map
    this.instance = this.data[0].map.instance
    this.initialiseHightLightMap()

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }
    let controls = this.instance.view.controls as OrbitControls

    const camera = this.instance.view.camera as PerspectiveCamera

    const focalLength = this.instance.view.camera.position.distanceTo(controls.target);
    const fov = camera.fov * (Math.PI / 180);
    const aspect = camera.aspect;

    const heightNear = 2 * Math.tan(fov / 2) * focalLength;
    const mapWith = heightNear * aspect;


    if (this.data == undefined && this.data.filter((dt) => dt.feature != undefined).length == 0) {
      this.closeModal()
    }

    this.entities$ = of(this.data).pipe(
      switchMap(() => {
        const f = this.data.map((data) => {
          const dataOsmLAyer = this.dataOsmLayersServiceService.getLayerInMap(data.layer_id)
          return iif(
            () => data.feature != undefined,
            of(data).pipe(
              map((data) => {
                const entity: EntitySheet = {
                  feature: Object.assign(
                    data.feature,
                    {
                      primary_key_field: dataOsmLAyer?.layer.providers[0].vp.primary_key_field,
                      provider_vector_id: dataOsmLAyer?.layer.providers[0].vp.provider_vector_id,
                      provider_style_id: dataOsmLAyer?.layer.providers[0].vs.provider_style_id
                    }
                  ),
                  data: data,
                  dataOsmLAyer: dataOsmLAyer
                }

                return entity
              })
            ),
            of(data).pipe(
              filter(() => dataOsmLAyer != undefined),
              map((data) => {
                return dataOsmLAyer.layer.providers.map((provider) => {
                  let url = environment.url_carto + provider.vp.path_qgis

                  // var cartoClass = new CartoHelper(this.data.map)

                  let target_resolution = mapWith / this.instance.domElement.width
                  const wms_image_size = 101
                  let ex = Extent.fromCenterAndSize('EPSG:3857', { x: data.coordinates_3857[0], y: data.coordinates_3857[1] }, wms_image_size * target_resolution, wms_image_size * target_resolution)
                  const projectionObj = getProjection('EPSG:3857');
                  let extent = [
                    ex.bottomLeft().x,
                    ex.bottomLeft().y
                    , ex.topRight().x
                    , ex.topRight().y
                  ]
                  function toFixed(n, decimals) {
                    const factor = Math.pow(10, decimals);
                    return Math.round(n * factor) / factor;
                  }
                  function floor(n, decimals) {
                    return Math.floor(toFixed(n, decimals));
                  }

                  const x = floor((data.coordinates_3857[0] - extent[0]) / target_resolution, 4);
                  const y = floor((extent[3] - data.coordinates_3857[1]) / target_resolution, 4);
                  const v13 = true;
                  const baseParams = {
                    'QUERY_LAYERS': provider.vp.id_server,
                    'INFO_FORMAT': 'application/json',
                    // 'I': 50,
                    // 'J': 50,
                    'I': x,
                    'J': y,
                    'WIDTH': wms_image_size,
                    'HEIGHT': wms_image_size,
                    'CRS': "EPSG:3857",
                    'REQUEST': "GetFeatureInfo",
                    'SERVICE': 'WMS',
                    'VERSION': "1.3.0",
                    'FORMAT': 'image/png',
                    'TRANSPARENT': true,
                    'TILED': true
                  };
                  const axisOrientation = projectionObj.getAxisOrientation();
                  let bbox = extent
                  if (v13 && axisOrientation.substr(0, 2) == 'ne') {
                    bbox = [extent[1], extent[0], extent[3], extent[2]];
                  }
                  baseParams['BBOX'] = bbox.join(',');

                  function appendParams(uri, params) {
                    /** @type {Array<string>} */
                    const keyParams = [];
                    // Skip any null or undefined parameter values
                    Object.keys(params).forEach(function (k) {
                      if (params[k] !== null && params[k] !== undefined) {
                        keyParams.push(k + '=' + encodeURIComponent(params[k]));
                      }
                    });
                    const qs = keyParams.join('&');
                    // remove any trailing ? or &
                    uri = uri.replace(/[?&]$/, '');
                    // append ? or & depending on whether uri has existing parameters
                    uri += uri.includes('?') ? '&' : '?';
                    return uri + qs;
                  }
                  return {
                    url: appendParams(url, baseParams) + "&INFO_FORMAT=application/json&WITH_GEOMETRY=true&FI_POINT_TOLERANCE=10&FI_LINE_TOLERANCE=10&FI_POLYGON_TOLERANCE=10",
                    provider_vector_id: provider.vp,
                    provider_style: provider.vs,
                  }
                })
              }),
              switchMap((parameters) => {
                const headers = new HttpHeaders({ 'Content-Type': 'text/xml' });
                this.featureInfoIsLoading = true
                this.cdRef.detectChanges();
                return concat(...parameters.map((param) => {
                  return this.http.get(param.url, { responseType: 'text' }).pipe(
                    catchError(() => {
                      this.featureInfoIsLoading = false
                      this.cdRef.detectChanges();
                      return EMPTY
                    }),
                    map((response) => {
                      return new GeoJSON().readFeatures(response).map((feature) => {
                        const entity: EntitySheet = {
                          feature: Object.assign(feature, { primary_key_field: param.provider_vector_id.primary_key_field, provider_vector_id: param.provider_vector_id.provider_vector_id, provider_style_id: param.provider_style.provider_style_id })
                          ,
                          data: data,
                          dataOsmLAyer: dataOsmLAyer
                        }
                        return entity
                      })
                    }),
                  )
                })).pipe(
                  /** retry 3 times after 2s if querry failed  */
                  retryWhen(errors =>
                    errors.pipe(
                      tap((val: HttpErrorResponse) => {
                        console.log(val)
                      }),
                      delayWhen((val: HttpErrorResponse) => timer(2000)),
                      // delay(2000),
                      take(3)
                    )
                  ),
                  toArray(),
                  map((values) => {
                    this.featureInfoIsLoading = false
                    this.cdRef.detectChanges();
                    // return values
                    return [].concat.apply([], values);
                  }),

                )

              })
            )
          )
        })
        return f

      }),
      switchMap((features) => {
        return features
      }),
      toArray(),
      map((features) => {

        if (features.length == 0) {
          this.closeModal()
        }
        if ((Array.isArray(features[0]))) {
          features = [].concat.apply([], features);
        }
        return features
      })
    )

    const cartoClass = new CartoHelper(this.map)

    fromMapGiroEvent<"layer-order-changed">(this.map, "layer-order-changed").pipe(
      takeUntil(this.destroyed$),
      filter(_ => this.map.getLayers((layer) => layer.name == this.HighlightLayer.name).length > 0),
      debounceTime(1000),
      tap(() => {
        let searchResultLayer = cartoClass.getLayerByName(this.HighlightLayer.name)[0]
        cartoClass.moveLayerOnTop(searchResultLayer)
      })
    ).subscribe()

  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  removeAllObjectsInMap() {
    // @ts-expect-error
    if (this.data.object && this.data.object.isSelectable) {
      for (let i = 0; i < this.data.length; i++) {
        const data = this.data[i]
        data.map.instance.notifyChange([data.object])
        // @ts-expect-error
        data.object.clearFeatureSelected()
      }
    }
    this.map.getLayers((layer) => layer.name == this.HighlightLayer.name).forEach((layer) => {
      const source = (layer as ColorLayer).source as VectorSource
      source.source.clear()
      const cartoClass = new CartoHelper(this.map)
      cartoClass.moveLayerOnTop((layer as ColorLayer))
    })

  }
  ngOnDestroy() {
    // var cartoClass = new CartoHelper(this.data.map)
    // let highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
    // const source = highlightLayer.source as VectorSource
    // source.source.clear()
    this.removeAllObjectsInMap()
    this.destroyed$.complete()
  }

  getFeatureName(entity: EntitySheet) {
    if (entity.data.type == 'osm') {
      const properties = entity.feature.getProperties()
      if (properties['name']) {
        return properties['name']
      } else {
        return "Entité sans nom"
      }

    } else if (entity.data.type == 'building') {
      let properties = entity.feature.getProperties()
      if (properties['name']) {
        return "Bâtiment " + properties['name']
      } else {
        return "Bâtiment sans nom"
      }
    }
    return " "

  }

  getFeatureIcon(entity: EntitySheet) {
    if (entity.data.type == 'osm') {
      return environment.backend + entity.dataOsmLAyer.layer.cercle_icon
    }
  }
  getModalName() {
    if (this.selectedEntity) {
      return this.getFeatureName(this.selectedEntity)
    }
    return ""
  }

  getModalIcon() {
    if (this.selectedEntity) {
      return this.getFeatureIcon(this.selectedEntity)
    }
  }



  /**
   * Initialise hightLight layer in the map
   */
  initialiseHightLightMap() {
    if (this.map.getLayers((layer) => layer.name == this.HighlightLayer.name).length == 0) {
      this.map.addLayer(this.HighlightLayer)
    }

  }

  /**
   * Close modal
   */
  closeModal(): void {

    this.dialogRef.close();
  }


  /**
  * Covert a color from hex to rgb
  * @param hex string
  * @return  {r: number, g: number, b: number }
  */
  hexToRgb(hex: string): { r: number, g: number, b: number } {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

}
