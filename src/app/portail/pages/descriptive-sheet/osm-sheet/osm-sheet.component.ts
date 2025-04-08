import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, ViewChild, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { manageDataHelper } from '../../../../../helper/manage-data.helper'
import { ImageWMS, TileWMS, GeoJSON, VectorLayer, Coordinate, Polygon, GeometryLayout, LineString, MultiLineString, LinearRing } from '../../../../ol-module';
import { CartoHelper } from '../../../../../helper/carto.helper'
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { NotifierService } from "angular-notifier";
import { retryWhen, tap, delayWhen, take, switchMap, map, toArray, shareReplay, debounceTime, filter, startWith, withLatestFrom, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { concat, ReplaySubject, Subject, timer, Observable, of, interval } from 'rxjs';
import { ShareServiceService } from '../../../../services/share-service/share-service.service'
import { measureUtil } from '../../../../../utils/measureUtils'
import { Feature, getUid } from 'ol';
import { Group, Layer } from '../../../../type/type';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { MatLegacyChip as MatChip, MatLegacyChipList as MatChipList } from '@angular/material/legacy-chips';
import { getCenter, buffer } from 'ol/extent';
import { FeatureForSheet, HighlightFeatureTile, HighlightLayerUserData } from '../descriptive-sheet.component';
import { environment } from '../../../../../environments/environment';

import {
  Extent,
  Instance,
  Map,
  Layer as giroLayer,
  ColorLayer,
  LayerUserData,
  VectorSource
} from "../../../../giro-3d-module"
import { BufferAttribute, BufferGeometry, Camera, Clock, Color, InstancedBufferAttribute, InstancedBufferGeometry, MathUtils, Mesh, MeshStandardMaterial, Object3D, Object3DEventMap, PerspectiveCamera, ShaderMaterial, Vector2, Vector3 } from 'three';
import { FeaturesStoreService } from '../../../../data/store/features.store.service';
import { AppInjector } from '../../../../../helper/app-injector.helper';
import { createFloorVertices } from '../../../../processing/buildings';
import Earcut from 'earcut';
import { Line2, LineGeometry, LineMaterial, MapControls } from 'three/examples/jsm/Addons';
import { createPositionBuffer, ensureLineStringNotClosed, ensureMultiLineStringNotClosed, subdivideLineString, subdivideMultiLineString } from '../../../../processing/linestring/utils';
declare var OpeningHoursParser: any;

export interface Week {
  _intervals: Array<Interval>
  getIntervals: () => Array<Interval>
}

export interface Day {
  _intervals: Array<Interval>
  getIntervals: () => Array<Interval>
}

export interface Interval {
  getEndDay: () => number
  getFrom: () => number
  getStartDay: () => number
  getTo: () => number
}

export interface DateRange {
  getTypical: () => Week | Day
}

export interface AttributeInterface {
  field: string,
  value: string,
  display: boolean
}

export interface ConfigTagsOsm {
  [key: string]: {
    /**
     * display attribute or not
     */
    display: boolean,
    /**
     * type of config
     * url, image,tel
     */
    type: string,
    header: string
    /**
     * url to insert before the value
     */
    prefix?: string,
    /**
     * url to insert before the value
     */
    surfix?: string,
    /**
     * replace original value with a symbol (icon, color)
     */
    values?: { [key: string]: Object }
  }
}

@Component({
  selector: 'app-osm-sheet',
  templateUrl: './osm-sheet.component.html',
  styleUrls: ['./osm-sheet.component.scss']
})
/**
 * display attributes of an openlayers feature
 * if properties does not exist on descriptiveModel, go find it with wms feature info
 * if geometry does not exist on descriptiveModel, go find it with wms feature info of wfs
 *
 * @todo create a general class
 */
export class OsmSheetComponent implements OnInit, OnChanges {
  featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);

  public onInitInstance: () => void
  environment = environment

  @Input() map: Map
  @Input() object: Object3D<Object3DEventMap>

  /**
   * Coordinate at pixel where the user clicked
   */
  @Input() coord: Coordinate
  @Input() dataOsmLAyer: {
    group: Group;
    layer: Layer;
  }
  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  @Input() features: FeatureForSheet[]

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * loading
   */
  loading: {
    properties: boolean,
    osmUrl: boolean
  } = {
      properties: false,
      osmUrl: false
    }

  /**
   * number of initial number of attributes that can be display
   */
  initialNumberOfAttributes: number = 5

  private readonly notifier: NotifierService;

  configTagsOsm$: Observable<ConfigTagsOsm>

  @ViewChild(MatChipList) matChipList: MatChipList

  /**
   * extent of the current feature, if the user want to zoom on int
   */
  extent: Extent


  /**
   * Feature to display
   */
  featureToDisplay$: Observable<AttributeInterface[]>

  /**
   * selected/current feature to display
   */
  selectedFeature: FeatureForSheet

  /**
   * Osm url of selected feature
   */
  osm_url: string



  listenToChipsChanged(matChipList: MatChipList) {
    this.featureToDisplay$ = matChipList.chipSelectionChanges.pipe(
      // startWith(matChipList.value),
      filter((value) => value.selected),
      map((chipChnaged) => {
        let feature: FeatureForSheet = chipChnaged.source.value
        this.selectedFeature = feature
        if (feature.getGeometry()) {
          let ol_extent = buffer(feature.getGeometry().getExtent(), feature.getGeometry().getType() == "Point" ? 20 : 20)
          let ol_extent_center = getCenter(ol_extent)

          this.extent = Extent.fromCenterAndSize('EPSG:3857', { x: ol_extent_center[0], y: ol_extent_center[1] }, ol_extent[2] - ol_extent[0], ol_extent[3] - ol_extent[1])
        } else {
          this.extent = undefined
        }
        // var cartoClass = new CartoHelper(this.map)
        // let highlightLayer = cartoClass.getLayerByName('highlightFeature')[0]
        // const source = highlightLayer.source as VectorSource
        // source.source.clear()
        this.getOsmLink(feature)

        this.addFeatureToMesh(feature)
        // setTimeout(() => {
        //   source.source.addFeature(feature)
        //   source.update()
        //   // console.log(source.source.getFeatures())
        // }, 500);
        return this.formatFeatureAttributes(feature)
      }),
      shareReplay(1)
    )



  }

  addFeatureToMesh(feature: FeatureForSheet) {
    const instance = this.map["_instance"]

    // @ts-expect-error
    if (this.object && this.object.isSelectable == true) {
      // @ts-expect-error
      this.object.setFeatureUidSelected(getUid(feature))
      instance.notifyChange([this.object], true)
      return
    }

    let coordinate = getCenter(feature.getGeometry().getExtent())

    const featureCenter = new Vector2(coordinate[0], coordinate[1])
    const highlight_feature_tile = instance.getObjects((obj) => obj.userData.name == "highlightFeature")[0] as HighlightFeatureTile
    highlight_feature_tile.reset()
    const tile = highlight_feature_tile.getTile(
      featureCenter
    )

    if (feature.getGeometry().getType() == "Polygon" || feature.getGeometry().getType() == "MultiPolygon" || feature.getGeometry().getType() == "Circle") {
      // const flatCoordinates = feature.getGeometry().getFlatCoordinates()
      // @ts-expect-error
      const newFlatCoordinates = feature.getGeometry().getFlatCoordinates().map((coord, index) => {
        // pair => x
        if (index % 2 == 0) {
          return coord - tile.position.x
        }
        return coord - tile.position.y
      })
      // const newFlatCoordinates = feature.getGeometry().getFlatCoordinates()
      // @ts-expect-error
      const newPolygon = new Polygon(newFlatCoordinates, GeometryLayout.XY, feature.getGeometry().ends_)
      // console.log(feature, newFlatCoordinates, "feature")
      const { flatCoordinates, holes } = createFloorVertices(
        newPolygon.getCoordinates(),
        newPolygon.getStride(),
        new Vector3(0, 0, -1),
        10,
        true,
      );

      const pointCount = flatCoordinates.length / 3;
      const floorPositionsCount = flatCoordinates.slice().length
      const triangles = Earcut(flatCoordinates, holes, 3);
      const positions = new Float32Array(flatCoordinates);
      const indices =
        positions.length <= 65536 ? new Uint16Array(triangles) : new Uint32Array(triangles);


      const surfaceGeometry = new BufferGeometry();
      surfaceGeometry.setAttribute('position', new BufferAttribute(positions, 3));
      surfaceGeometry.setIndex(new BufferAttribute(indices, 1));
      surfaceGeometry.computeBoundingBox();
      surfaceGeometry.computeBoundingSphere();
      surfaceGeometry.computeVertexNormals();

      const mesh = new Mesh(surfaceGeometry, new MeshStandardMaterial({
        color: new Color(1, 0, 0),
        opacity: 0.5,
        transparent: true
      }))

      mesh.updateMatrix()
      mesh.updateMatrixWorld()
      mesh.frustumCulled = false

      tile.add(mesh)

      // Don't know why, but after loading features, the doesn't appear, till one move the map

      setTimeout(() => {
        instance.engine.renderer.render(tile, instance.view.camera)
        instance.engine.renderer.render(instance.scene, instance.view.camera)
        // instance.notifyChange(this.map, true)
      }, 100);

    } else if (feature.getGeometry().getType() == "LineString" || feature.getGeometry().getType() == "LinearRing" || feature.getGeometry().getType() == "MultiLineString") {

      let geometry = feature.getGeometry() as LineString | MultiLineString | LinearRing
      const lineGeometry = new LineGeometry();
      let coordinates: Array<Coordinate>

      if (geometry.getType() == "MultiLineString") {
        ensureMultiLineStringNotClosed(geometry as MultiLineString)
        const newMultiLineString = subdivideMultiLineString(geometry as MultiLineString, 1)
        coordinates = [].concat(...newMultiLineString.getCoordinates())

      } else {
        ensureLineStringNotClosed(geometry as LineString)
        geometry = subdivideLineString((geometry as LineString), 1)
        coordinates = geometry.getCoordinates()
      }

      lineGeometry.setPositions(
        createPositionBuffer(
          coordinates,
          {
            ignoreZ: true,
            origin: new Vector3(tile.position.x, tile.position.y, -1),
          }

        )
      )
      lineGeometry.computeBoundingBox();

      const lineMaterial = new LineMaterial({
        color: feature.getProperties()["colour"] ? feature.getProperties()["colour"] : "red",
        linewidth: 0.02, // Notice the different case
        opacity: 0.9,
        transparent: true,
      });

      const lineMesh = new Line2(lineGeometry, lineMaterial)
      lineMesh.updateMatrix()
      lineMesh.updateMatrixWorld()
      lineMesh.frustumCulled = false

      tile.add(lineMesh)
      // Don't know why, but after loading features, the doesn't appear, till one move the map
      setTimeout(() => {
        instance.engine.renderer.render(tile, instance.view.camera)
        instance.engine.renderer.render(instance.scene, instance.view.camera)
      }, 100);

    } else {

      let highlightFeatureMesh: Mesh<InstancedBufferGeometry, ShaderMaterial, Object3DEventMap> = tile.children[0] as any


      const instancePosition = new Float32Array(3);

      instancePosition[0] = coordinate[0] - tile.position.x
      instancePosition[1] = coordinate[1] - tile.position.y
      instancePosition[2] = this.featuresStoreService.getBuildingHeightAtPoint(
        featureCenter
      ) + 0.01

      // console.log(instancePosition)
      highlightFeatureMesh.geometry.instanceCount = 1
      highlightFeatureMesh.geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(instancePosition, 3));
      highlightFeatureMesh.updateMatrix()
      highlightFeatureMesh.updateMatrixWorld()
      highlightFeatureMesh.material.needsUpdate = true

      // Don't know why, but after loading features, the doesn't appear, till one move the map
      setTimeout(() => {
        const camera = instance.view.camera
        camera.translateX(0.000001);
        instance.notifyChange([camera], true)
      }, 100);

      this.featuresStoreService.buildingsHeights$.pipe(
        debounceTime(1000),
        takeUntil(this.destroyed$),
        filter(buildingsHeights => buildingsHeights.size > 0),
        tap((buildingsHeights) => {

          instancePosition[2] = this.featuresStoreService.getBuildingHeightAtPoint(
            featureCenter
          ) + 0.01
          highlightFeatureMesh.geometry.setAttribute("aInstancePosition", new InstancedBufferAttribute(instancePosition, 3));
          highlightFeatureMesh.updateMatrix()
          highlightFeatureMesh.updateMatrixWorld()
          highlightFeatureMesh.material.needsUpdate = true
        })
      ).subscribe()
    }

  }


  constructor(
    public BackendApiService: BackendApiService,
    notifierService: NotifierService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {
    this.notifier = notifierService;
    this.initialNumberOfAttributes = 5

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }


    this.configTagsOsm$ = onInit.pipe(
      take(1),
      switchMap(() => {
        return this.http.get<ConfigTagsOsm>('/assets/config/config_tags.json')
      }),
      tap(() => {
        this.listenToChipsChanged(this.matChipList)
        /**
         * if after 500ms, no chips is selected (idk why this happens)
         */
        this.matChipList.chips.changes.pipe(
          startWith(undefined),
          // take(1),
          debounceTime(500),
          filter(() => this.matChipList.chips.length > 0),
          tap(() => {
            this.toggleSelection(this.matChipList.chips.first)
          }),
        ).subscribe()
      })
    )

  }

  toggleSelection(chip: MatChip) {
    chip.toggleSelected();
    this.cdRef.detectChanges();
  }

  async ngOnInit() {


  }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    if (changes.dataOsmLAyer) {
      if (this.dataOsmLAyer && this.features.length > 0) {
        this.onInitInstance()

      }
    }

  }

  ngOnDestroy(): void {
    this.destroyed$.complete()

  }

  ngAfterViewInit() {

  }


  /**
   * Format feature attributes
   */
  formatFeatureAttributes(feature: Feature): AttributeInterface[] {
    let listAttributes = []
    let properties = feature.getProperties()

    if (properties['hstore_to_json']) {
      let values_hstore_to_json: AttributeInterface[] = []
      if (typeof properties['hstore_to_json'] === 'object') {
        values_hstore_to_json = this._formatHtsore(properties['hstore_to_json'])

      } else if (typeof properties['hstore_to_json'] === 'string') {
        let stringToJson = function (myString) {
          let myObject = {}
          for (let index = 0; index < myString.split(',').length; index++) {
            const element = myString.split(',')[index];
            myObject[element.split(': ')[0].replace(/\s/, '')] = element.split(': ')[1]
          }
          return JSON.stringify(myObject)
        }

        try {

          let objetHstore = JSON.parse(stringToJson(properties['hstore_to_json']))

          values_hstore_to_json = this._formatHtsore(objetHstore)
        } catch (error) {
          console.error(error, stringToJson(properties['hstore_to_json']))
          values_hstore_to_json = []
        }
      }
      for (let index = 0; index < values_hstore_to_json.length; index++) {
        const element = values_hstore_to_json[index];
        listAttributes.push({
          field: element.field,
          value: element.value,
          display: element.display
        })
      }

    }


    for (const key in properties) {

      if (properties.hasOwnProperty(key) &&

        ['number', 'string'].indexOf(typeof properties[key]) != -1 &&
        ['fid', 'osm_id', 'name', 'gid', "osm_uid", "featureId"].indexOf(key) == -1
      ) {

        const value = properties[key];

        var positionOfKeyInListAttribute = manageDataHelper.isAttributesInObjectOfAnArray(listAttributes, key, value)
        if (positionOfKeyInListAttribute) {
          listAttributes.splice(positionOfKeyInListAttribute, 1, {
            field: key,
            value: value,
            display: true
          })
        } else {
          listAttributes.push({
            field: key,
            value: value,
            display: true
          })
        }



      }
    }
    return listAttributes

  }

  _formatHtsore(hstore_to_json: Object): AttributeInterface[] {
    let values: AttributeInterface[] = []
    for (const key in hstore_to_json) {
      if (hstore_to_json.hasOwnProperty(key) && ['osm_user', 'osm_changeset', 'osm_timestamp', 'osm_version', "osm_uid", "featureId"].indexOf(key) == -1) {
        const value = hstore_to_json[key];

        values.push({
          field: key,
          value: value,
          display: true
        })

      }
    }
    return values
  }

  getNameOfFeature(feature: Feature, index: number): string {
    let properties = feature.getProperties()
    if (properties['name']) {
      return properties['name']
    } else {
      return "Entité " + index
    }
  }

  /**
   * find OSM link of this feature
   * @return string
   */
  getOsmLink(feature: Feature) {
    let properties = feature.getProperties()

    if (properties['osm_id']) {
      let osm_id = properties['osm_id']
      this.loading.osmUrl = true
      var url =
        "https://nominatim.openstreetmap.org/lookup?osm_ids=R" +
        Math.abs(osm_id) +
        ",W" +
        Math.abs(osm_id) +
        ",N" +
        Math.abs(osm_id) +
        "&format=json";

      this.http.get(url).pipe(
        take(1),
        map((response: any) => {
          if (response.length > 0) {
            var osm_type = response[0].osm_type;
            var osm_id = response[0].osm_id;
            this.osm_url = "https://www.openstreetmap.org/" + osm_type + "/" + osm_id;
          } else {
            this.osm_url = undefined
          }
        })
      ).subscribe()

    } else {
      this.osm_url = undefined
    }
  }

  constructOpeningHOurs(opening_hours: string): {
    mo: string[];
    tu: string[];
    we: string[];
    th: string[];
    fr: string[];
    sa: string[];
    su: string[];
  } {

    function pad(num) {
      return ("0" + num).slice(-2);
    }
    function hhmmss(secs) {
      var minutes = Math.floor(secs / 60);
      secs = secs % 60;
      var hours = Math.floor(minutes / 60)
      minutes = minutes % 60;
      return `${pad(minutes)}h${pad(secs)}`;
      // return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
      // return pad(hours)+":"+pad(minutes)+":"+pad(secs); for old browsers
    }
    var checker = new OpeningHoursParser();
    // opening_hours='12:00-14:30,19:00-22:30'
    try {
      let dateRanges: Array<DateRange> = checker.parse(opening_hours.trim())
      let intervals: Interval[] = dateRanges[0].getTypical().getIntervals()
      let response = {
        mo: intervals.filter((interval) => interval && interval.getStartDay() == 0).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        tu: intervals.filter((interval) => interval && interval.getStartDay() == 1).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        we: intervals.filter((interval) => interval && interval.getStartDay() == 2).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        th: intervals.filter((interval) => interval && interval.getStartDay() == 3).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        fr: intervals.filter((interval) => interval && interval.getStartDay() == 4).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        sa: intervals.filter((interval) => interval && interval.getStartDay() == 5).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
        su: intervals.filter((interval) => interval && interval.getStartDay() == 6).map((interval) => { return hhmmss(interval.getFrom()) + ' - ' + hhmmss(interval.getTo()) }),
      }
      return response

    } catch (error) {
      console.error(error)
      return
    }
  }

  /**
   * construct adresse of the feature osm if exist
   */
  constructAdresse(listAttributes: AttributeInterface[]): string {
    var count_adresse = 0
    var adresse = {
      "housenumber": undefined,
      "street": undefined,
      "city": '',
      "postcode": '',
    }

    for (let index = 0; index < listAttributes.length; index++) {
      const element = listAttributes[index];
      if (element.field == "addr:city") {
        count_adresse = count_adresse + 1
        adresse.city = element.value
      }
      if (element.field == "addr:street") {
        count_adresse = count_adresse + 1
        adresse.street = element.value
      }
      if (element.field == "addr:housenumber") {
        count_adresse = count_adresse + 1
        adresse.housenumber = element.value
      }
      if (element.field == "addr:postcode") {
        count_adresse = count_adresse + 1
        adresse.postcode = element.value
      }
    }
    if (adresse.housenumber && adresse.street) {
      return adresse.housenumber + ' ' + adresse.street + ' ' + adresse.city + ' ' + adresse.postcode
      // this.adresse = adresse.housenumber + ' ' + adresse.street + ' ' + adresse.city + ' ' + adresse.postcode
    }
  }

  /**
   * Format area
   * @param area
   */
  formatArea(area): string {
    var intArea = parseFloat(area)
    var unit: "sqm" | "hectar" | "sqkm" | "sqft" | "sqmi" = 'sqm'
    var unitHuman = 'm²'
    if (area > 10000) {
      unit = 'hectar'
      unitHuman = 'hectare'
    }

    if (area > 100000000) {
      unit = 'sqkm'
      unitHuman = 'Km²'
    }

    return Math.round((new measureUtil().getFormattedArea(unit, intArea) + Number.EPSILON) * 100) / 100 + ' ' + unitHuman
  }

  openUrl(url) {
    console.log(url)
    window.open(url, '_blank')
  }

  /**
   * alert value
   * @param value string
   */
  alertValue(value: string) {
    console.log(value)
    alert(value)
  }

  /**
  * Zoom on feature extent
  */
  zoomOnFeatureExtent() {
    if (this.selectedFeature.getGeometry()) {
      if (this.selectedFeature.getGeometry().getType() == "Point" || this.selectedFeature.getGeometry().getType() == "MultiPoint") {
        const coordinate = this.extent.center()

        new CartoHelper(this.map).panTo(new Vector3(
          coordinate.x,
          coordinate.y,
          0
        ))

      } else {
        let cartoClass = new CartoHelper(this.map)
        cartoClass.zoomToExtent(CartoHelper.olGeometryToGiroExtent(this.selectedFeature.getGeometry()), 16)

      }
    }
  }

}
