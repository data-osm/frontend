import { Component, OnInit, Inject, SimpleChanges, OnChanges, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Group, Layer } from '../../../type/type';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { CartoHelper } from '../../../../helper/carto.helper';
// import { ManageCompHelper } from '../../../../helper/manage-comp.helper';
import { environment } from '../../../../environments/environment';
import { VectorLayer, Style, Fill, Stroke, CircleStyle, GeoJSON, Feature, Coordinate, ImageLayer, TileLayer, ImageWMS, getProjection } from '../../../ol-module';
import Geometry from 'ol/geom/Geometry';
import { concat, EMPTY, Observable, of, ReplaySubject, Subject, timer } from 'rxjs';
import { catchError, delayWhen, filter, map, retryWhen, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
import { DataOsmLayersServiceService } from '../../../services/data-som-layers-service/data-som-layers-service.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { OsmSheetComponent } from './osm-sheet/osm-sheet.component';
import { boundingExtent } from 'ol/extent';

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
import { fromInstanceGiroEvent } from '../../../shared/class/fromGiroEvent';
/**
 * interface of the model to display a sheet properties
 */
export interface DescriptiveSheetData {
  /**
   * type of layer, 'osm' for osm layers
   */
  type: string,
  /**
   * Data osm layer id
   */
  layer_id: number
  /**
   * Featur user clicked on if exist
   */
  feature?: Feature,
  /**
   * layer user clicked on
   */
  layer: giroLayer,
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
export interface HighlightLayerUserData extends LayerUserData {
  type_layer: string,
  nom: string
}

const BUILDING_TILE_SIZE = 30000
const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()
export class HighlightFeatureTile extends ThreeGroup {
  _tileSets: Map<string, ThreeGroup> = new Map()

  // readonly isFeatureTile = true;
  readonly type = 'HighlightFeatureTile';


  userData = {
    name: "highlightFeature"
  };

  reset() {
    this.clear()
    this._tileSets.clear()
  }

  listPointMesh() {
    const pointsMesh: Array<Mesh<InstancedBufferGeometry, ShaderMaterial, Object3DEventMap>> = []
    this._tileSets.forEach((value, key) => {
      for (let index = 0; index < value.children.length; index++) {
        const element = value.children[index];
        if (element.userData.type == "pointMesh") {
          pointsMesh.push(element as Mesh<InstancedBufferGeometry, ShaderMaterial, Object3DEventMap>)
        }
      }
    })
    return pointsMesh
  }

  getTile(coordinate: Vector2) {
    const tilePosition = new Vector2(Math.ceil(coordinate.x / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE,
      Math.ceil(coordinate.y / BUILDING_TILE_SIZE) * BUILDING_TILE_SIZE)
    const tile_key = tilePosition.x + "_" + tilePosition.y
    if (this._tileSets.has(tile_key)) {
      return this._tileSets.get(tile_key)
    }

    const newTile = new ThreeGroup()
    newTile.userData.key = tile_key
    newTile.position.set(
      tilePosition.x, tilePosition.y, 0
    )

    let pointMesh = new Mesh(this.getPointGeometry(), this.getMaterial())
    pointMesh.frustumCulled = false
    pointMesh.userData.type = "pointMesh"

    newTile.add(
      pointMesh
    )
    newTile.updateMatrixWorld()
    newTile.updateMatrix()
    this._tileSets.set(tile_key, newTile)
    this.add(newTile)

    return newTile

  }

  getPointGeometry() {
    // @ts-expect-error
    const geometry = new InstancedBufferGeometry().copy(new CircleGeometry(30, 15));
    // const geometry = new InstancedBufferGeometry().copy(new PlaneGeometry(60, 60));

    return geometry

  }


  getMaterial() {
    const material = new ShaderMaterial({
      // depthTest: false,
      // depthWrite: false,
      // side: DoubleSide,
      transparent: true,
      vertexShader: `
        uniform vec4 quaternion;

        attribute vec3 aInstancePosition;

        varying vec2 vUv;
        // const float rotation = 0.0;

        vec3 qtransform( vec4 q, vec3 v ){ 
          return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
        } 

          void main(){

          // 60 is the width of the plane geometry here
          float scaleFactor = (cameraPosition.z * 60.0 * 5.0 / 1000.0 / 1000.0);
          if (scaleFactor < 0.13){
            scaleFactor = 0.13;
          }
          
          vec3 scalePos = position * scaleFactor;
          vec3 pos = qtransform(quaternion, scalePos) + aInstancePosition ;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0);
            gl_Position.z -= 60.0*8.0*scaleFactor;
            vUv = uv;
          
          }
      `,
      fragmentShader: `
        // uniform sampler2D uTexture;
        void main(){
          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        }
      `,
      uniforms: {
        quaternion: { value: new Quaternion() },
        // quaternion: { value: this.instance.view.camera.quaternion.clone().invert() },
      },
    }
    )
    return material
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
   * current dataOsmLAyer
   */
  dataOsmLAyer: {
    group: Group;
    layer: Layer;
  }


  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  features$: Observable<FeatureForSheet[]>
  highlightFeatureTile: HighlightFeatureTile

  environment = environment

  // OsmSheetComponent

  /**
 * extent of the current feature, if the user want to zoom on int
 */
  extent: Extent

  featureInfoIsLoading: boolean = false
  private instance: Instance
  // private map: Giro3DMap

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DescriptiveSheetData,
    public dialogRef: MatDialogRef<DescriptiveSheetComponent>,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
    // public manageCompHelper:ManageCompHelper,
    // public ShareServiceService:ShareServiceService
  ) {

    this.instance = this.data.map["_instance"]
    this.initialiseHightLightMap()

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }
    const instance = this.data.map["_instance"] as Instance
    let controls = instance.view.controls as OrbitControls

    const camera = instance.view.camera as PerspectiveCamera

    const focalLength = instance.view.camera.position.distanceTo(controls.target);
    const fov = camera.fov * (Math.PI / 180);
    const aspect = camera.aspect;

    const heightNear = 2 * Math.tan(fov / 2) * focalLength;
    const mapWith = heightNear * aspect;

    this.dataOsmLAyer = this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id)
    if (this.dataOsmLAyer == undefined) {
      this.closeModal()
    }

    if (this.data.feature) {
      this.features$ = of([
        Object.assign(this.data.feature,
          {
            primary_key_field: this.dataOsmLAyer.layer.providers[0].vp.primary_key_field,
            provider_vector_id: this.dataOsmLAyer.layer.providers[0].vp.provider_vector_id,
            provider_style_id: this.dataOsmLAyer.layer.providers[0].vs.provider_style_id
          })])

    } else {

      this.features$ = onInit.pipe(
        filter(() => this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id) != undefined),
        tap(() => { this.dataOsmLAyer = this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id); this.cdRef.detectChanges(); }),
        map(() => {
          return this.dataOsmLAyer.layer.providers.map((provider) => {
            let url = environment.url_carto + provider.vp.path_qgis

            // var cartoClass = new CartoHelper(this.data.map)
            let target_resolution = mapWith / this.data.map["_instance"].domElement.width
            const wms_image_size = 101
            let ex = Extent.fromCenterAndSize('EPSG:3857', { x: this.data.coordinates_3857[0], y: this.data.coordinates_3857[1] }, wms_image_size * target_resolution, wms_image_size * target_resolution)
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

            const x = floor((this.data.coordinates_3857[0] - extent[0]) / target_resolution, 4);
            const y = floor((extent[3] - this.data.coordinates_3857[1]) / target_resolution, 4);
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
                  return Object.assign(feature, { primary_key_field: param.provider_vector_id.primary_key_field, provider_vector_id: param.provider_vector_id.provider_vector_id, provider_style_id: param.provider_style.provider_style_id })
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
              return [].concat.apply([], values);
            }),
            tap((values) => {
              console.log(values)
              this.featureInfoIsLoading = false
              this.cdRef.detectChanges();
              if (values.length == 0) {
                this.closeModal()
              }
            })
          )

        })
      )
    }


  }

  ngOnInit(): void {
    this.onInitInstance()
  }


  ngOnDestroy() {
    // var cartoClass = new CartoHelper(this.data.map)
    // let highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
    // const source = highlightLayer.source as VectorSource
    // source.source.clear()
    // @ts-expect-error
    if (this.data.object && this.data.object.isSelectable) {
      // @ts-expect-error
      this.data.object.clearFeatureSelected()
    }
    if (this.highlightFeatureTile) {
      this.highlightFeatureTile.reset()
    }
    this.destroyed$.complete()
  }



  /**
   * Initialise hightLight layer in the map
   */
  initialiseHightLightMap() {

    if (this.instance.getObjects((obj) => obj.userData.name == "highlightFeature").length > 0) {
      this.highlightFeatureTile = this.instance.getObjects((obj) => obj.userData.name == "highlightFeature")[0] as any
    } else {
      this.highlightFeatureTile = new HighlightFeatureTile()

      this.instance.add(
        this.highlightFeatureTile
      )

    }
    fromInstanceGiroEvent(this.instance, "after-camera-update").pipe(
      tap(() => {
        for (let index = 0; index < this.highlightFeatureTile.listPointMesh().length; index++) {
          const pointMesh = this.highlightFeatureTile.listPointMesh()[index];
          pointMesh.material.uniforms.quaternion.value.copy(this.instance.view.camera.quaternion).invert()
        }
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

    // var cartoClass = new CartoHelper(this.data.map)
    // if (cartoClass.getLayerByName('highlightFeature').length > 0) {
    //   let highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
    //   while (this.data.map.getIndex(highlightLayer) < this.data.map.getLayers().length - 1) {
    //     this.data.map.moveLayerUp(highlightLayer)
    //   }
    // } else {
    //   let layer: ColorLayer<HighlightLayerUserData> = new ColorLayer({
    //     name: 'highlightLayer',
    //     source: new VectorSource({
    //       data: [],
    //       dataProjection: 'EPSG:3857',
    //       format: new GeoJSON(),
    //       style: () => {
    //         var color = '#f44336'
    //         return new Style({
    //           fill: new Fill({
    //             color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
    //           }),
    //           stroke: new Stroke({
    //             color: color,
    //             width: 6
    //           }),
    //           image: new CircleStyle({
    //             radius: 11,
    //             stroke: new Stroke({
    //               color: color,
    //               width: 4
    //             }),
    //             fill: new Fill({
    //               color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
    //             })
    //           })
    //         })
    //       },
    //     }),
    //   })
    //   layer.userData.type_layer = 'highlightFeature'
    //   layer.userData.nom = 'highlightFeature'
    //   cartoClass.map.addLayer(layer)
    //   let highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
    //   while (this.data.map.getIndex(highlightLayer) < this.data.map.getLayers().length - 1) {
    //     this.data.map.moveLayerUp(highlightLayer)
    //   }
    // }
    // if (cartoClass.getLayerByName('highlightFeature').length > 0) {
    //   const source = cartoClass.getLayerByName('highlightFeature')[0].source as VectorSource
    //   source.source.clear()
    // }

  }

  /**
   * Close modal
   */
  closeModal(): void {
    var cartoClass = new CartoHelper(this.data.map)

    // if (cartoClass.getLayerByName('highlightFeature').length > 0) {
    //   const source = cartoClass.getLayerByName('highlightFeature')[0].source as VectorSource
    //   source.source.clear()
    // }

    this.dialogRef.close();
  }

  /**
   * Share this feature
   */
  // shareFeature(){
  //   var url =  this.descriptiveModel.getShareUrl(environment,this.ShareServiceService)
  //   this.manageCompHelper.openSocialShare(
  //     url
  //   )
  // }




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
