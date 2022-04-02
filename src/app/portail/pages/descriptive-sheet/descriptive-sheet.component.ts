import { Component, OnInit, Inject, SimpleChanges, OnChanges, ChangeDetectorRef, ViewChild } from '@angular/core';
import {  Group, Layer } from '../../../type/type';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { layersInMap, CartoHelper } from '../../../../helper/carto.helper';
// import { ManageCompHelper } from '../../../../helper/manage-comp.helper';
import { environment } from '../../../../environments/environment';
import { VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, GeoJSON, Feature, Map, Coordinate, ImageLayer, TileLayer, ImageWMS } from '../../../ol-module';
import Geometry from 'ol/geom/Geometry';
import { concat, EMPTY, Observable, ReplaySubject, Subject, timer } from 'rxjs';
import { catchError, delayWhen, filter, map, retryWhen, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';
import { DataOsmLayersServiceService } from '../../../services/data-som-layers-service/data-som-layers-service.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { OsmSheetComponent } from './osm-sheet/osm-sheet.component';
import { Extent } from 'ol/extent';

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
  layer_id:number
  /**
   * Featur user clicked on if exist
   */
  feature?: Feature,
  /**
   * layer user clicked on
   */
  layer: ImageLayer|TileLayer|VectorLayer,
  map:Map
  /**
   * Coordiante at pixel where the user clicked
   */
  coordinates_3857: Coordinate,
  // getShareUrl?:(environment,ShareServiceService:ShareServiceService)=>string
}

export interface FeatureForSheet extends Feature{
  provider_style_id:number
  provider_vector_id: number;
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

  public onInitInstance:()=>void
  /**
   * current dataOsmLAyer
   */
   dataOsmLAyer: {
    group: Group;
    layer: Layer;
  }

  /**
   * VectorLayer of hightlight feature and style
   */
  highlightLayer: VectorLayer = new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      var color = '#f44336'
      return new Style({
        fill: new Fill({
          color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
        }),
        stroke: new Stroke({
          color: color,
          width: 6
        }),
        image: new CircleStyle({
          radius: 11,
          stroke: new Stroke({
            color: color,
            width: 4
          }),
          fill: new Fill({
            color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.5]
          })
        })
      })
    },
  });
  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  features$:Observable<FeatureForSheet[]>

  environment = environment

  // OsmSheetComponent

    /**
   * extent of the current feature, if the user want to zoom on int
   */
  extent:Extent

  featureInfoIsLoading:boolean=false


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DescriptiveSheetData,
    public dialogRef: MatDialogRef<DescriptiveSheetComponent>,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
    // public manageCompHelper:ManageCompHelper,
    // public ShareServiceService:ShareServiceService
  ) {
    this.highlightLayer.set('type_layer','highlightFeature')
    this.highlightLayer.set('nom','highlightFeature')
    this.initialiseHightLightMap()

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    onInit.pipe(
      filter(()=>this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id) == undefined),
      tap(()=>{
        this.closeModal()
      }),
      take(1)
    ).subscribe()

    this.features$ = onInit.pipe(
      filter(()=>this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id) != undefined),
      tap(()=>{this.dataOsmLAyer = this.dataOsmLayersServiceService.getLayerInMap(this.data.layer_id);  this.cdRef.detectChanges();}),
      map(()=>{
        return this.dataOsmLAyer.layer.providers.map((provider)=>{
          let url =environment.url_carto+provider.vp.path_qgis
          
          return {url: new ImageWMS({
            url: url,
            params: { 'LAYERS': provider.vp.id_server, 'TILED': true },
            serverType: 'qgis',
            crossOrigin: 'anonymous',
          }).getFeatureInfoUrl(this.data.coordinates_3857, this.data.map.getView().getResolution(), 'EPSG:3857',{})+"&INFO_FORMAT=application/json&WITH_GEOMETRY=true&FI_POINT_TOLERANCE=30&FI_LINE_TOLERANCE=10&FI_POLYGON_TOLERANCE=10"
          ,provider_vector_id:provider.vp.provider_vector_id,
          provider_style:provider.vs,
        }
        })
      }),
      switchMap((parameters)=>{
        const headers = new HttpHeaders({ 'Content-Type': 'text/xml' });
        this.featureInfoIsLoading = true
        this.cdRef.detectChanges();
        return concat(...parameters.map((param)=>{
          return this.http.get(param.url, { responseType: 'text' }).pipe(
            catchError(()=>{
              this.featureInfoIsLoading = false
              this.cdRef.detectChanges();
              return EMPTY
            }),
            map((response) => {
              return new GeoJSON().readFeatures(response).map((feature)=>{
                return Object.assign(feature,{provider_vector_id:param.provider_vector_id, provider_style_id:param.provider_style.provider_style_id})
              })
            }),
           )
        })).pipe(
          /** retry 3 times after 2s if querry failed  */
          retryWhen(errors=>
            errors.pipe(
              tap((val:HttpErrorResponse) => {
                // console.log(val)
              }),
              delayWhen((val:HttpErrorResponse) => timer(2000)),
              // delay(2000),
              take(3)
            )
          ),
          toArray(),
          map((values)=>{
            return [].concat.apply([], values);
          }),
          tap((values)=>{
            console.log(values)
            this.featureInfoIsLoading = false
            this.cdRef.detectChanges();
            if (values.length == 0 ) {
              this.closeModal()
            }
          })
        )

      })
    )

   }

  ngOnInit(): void {
    this.onInitInstance()
  }
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  ngOnDestroy(){
    this.highlightLayer.getSource().clear()
    this.destroyed$.complete()
  }


  /**
   * Initialise hightLight layer in the map
   */
  initialiseHightLightMap() {
    var cartoClass = new CartoHelper(this.data.map)
    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      this.highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
      this.highlightLayer.setZIndex(1000)
    } else {
      this.highlightLayer.setZIndex(1000)
      cartoClass.map.addLayer(this.highlightLayer)
    }

    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      cartoClass.getLayerByName('highlightFeature')[0].getSource().clear()
    }

  }

  /**
   * Close modal
   */
  closeModal(): void {
    var cartoClass = new CartoHelper(this.data.map)

    if (cartoClass.getLayerByName('highlightFeature').length > 0) {
      cartoClass.getLayerByName('highlightFeature')[0].getSource().clear()
    }

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
