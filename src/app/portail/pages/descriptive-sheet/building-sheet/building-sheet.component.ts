import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BufferAttribute, BufferGeometry, Camera, Clock, Color, InstancedBufferAttribute, InstancedBufferGeometry, MathUtils, Mesh, MeshStandardMaterial, Object3D, Object3DEventMap, PerspectiveCamera, ShaderMaterial, Vector2, Vector3 } from 'three';
import {
  Extent,
  Instance,
  Map,
  Layer as giroLayer,
  ColorLayer,
  LayerUserData,
  VectorSource
} from "../../../../giro-3d-module"
import { Coordinate, Feature } from '../../../../ol-module';
import { FeatureForSheet } from '../descriptive-sheet.component';
import { map, Observable, ReplaySubject, Subject, take } from 'rxjs';
import { NotifierService } from "angular-notifier";
import { AttributeInterface, ConfigTagsOsm } from '../osm-sheet/osm-sheet.component';
import { MatLegacyChip as MatChip, MatLegacyChipList as MatChipList } from '@angular/material/legacy-chips';
import { BackendApiService } from '../../../../services/backend-api/backend-api.service';
import { HttpClient } from '@angular/common/http';
import { manageDataHelper } from '../../../../../helper/manage-data.helper';
import { measureUtil } from '../../../../../utils/measureUtils';
import { CartoHelper } from '../../../../../helper/carto.helper';
import { getUid } from 'ol';
import { buffer, getCenter } from 'ol/extent';
import { FeaturesStoreService } from '../../../../data/store/features.store.service';
import { ParametersService } from '../../../../data/services/parameters.service';
import { BuildingProperties } from '../../../../processing/building/type';
@Component({
  selector: 'app-building-sheet',
  templateUrl: './building-sheet.component.html',
  styleUrls: ['./building-sheet.component.scss']
})
export class BuildingSheetComponent implements OnInit, OnChanges {

  private readonly notifier: NotifierService;

  public onInitInstance: () => void

  @Output() closeModal: EventEmitter<void> = new EventEmitter<void>
  @Input() map: Map
  @Input() object: Object3D<Object3DEventMap>

  /**
   * Coordinate at pixel where the user clicked
   */
  @Input() coord: Coordinate

  /**
   * List of features from WMSGetFeatureInfo at pixel where user clicked
   */
  @Input() feature: FeatureForSheet

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  /**
   * Feature to display
   */
  featureToDisplay$: Observable<AttributeInterface[]>

  /**
   * selected/current feature to display
   */
  selectedFeature$: Observable<AttributeInterface[]>



  constructor(
    public backendApiService: BackendApiService,
    private featuresStoreService: FeaturesStoreService,
    private parametersService: ParametersService,
    notifierService: NotifierService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.selectedFeature$ = onInit.pipe(
      map(() => {
        const instance = this.map.instance

        // @ts-expect-error
        if (this.object && this.object.isSelectable == true) {
          // @ts-expect-error
          this.object.setFeatureUidSelected(getUid(this.feature))
          instance.notifyChange([this.object])
        }
        return this.formatFeatureAttributes(this.feature)
      })
    )
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.

    if (changes.object) {
      if (changes.object.previousValue) {
        this.removeFeatureInMap(changes.object.previousValue)
      }
      this.onInitInstance()
    }

  }

  removeFeatureInMap(object: Object3D) {
    // @ts-expect-error
    if (this.object && this.object.isSelectable) {
      this.map.instance.notifyChange([this.object])
      // @ts-expect-error
      this.object.clearFeatureSelected()
    }
  }

  ngOnDestroy(): void {

    this.removeFeatureInMap(this.object)
    this.destroyed$.complete()

  }

  /**
   * Format feature attributes
   */
  formatFeatureAttributes(feature: Feature): AttributeInterface[] {
    let listAttributes = []
    let properties = feature.getProperties()




    for (const key in properties) {
      if (properties.hasOwnProperty(key) &&

        ['number', 'string'].indexOf(typeof properties[key]) != -1 &&
        ["@ombb00", "@ombb01", "@ombb10", "@ombb11", "@ombb20", "@ombb21", "@ombb30", "@ombb31", "elevation", "layer", "type", "osmType", "osmId_"].indexOf(key) == -1
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

  getNameOfFeature(feature: Feature, index: number): string {
    let properties = feature.getProperties()
    if (properties['name']) {
      return properties['name']
    }
  }

  /**
   * find OSM link of this feature
   * @return string
   */
  getOsmLink(feature: Feature) {
    let properties = feature.getProperties() as BuildingProperties
    const osmType = properties.osm_type

    let osmId = properties.osm_id
    return `https://www.openstreetmap.org/${osmType.toLowerCase()}/${osmId}`

  }

  formatColor(decimalColor: number) {
    return '#' + decimalColor.toString(16).padStart(6, '0');
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
    this.parametersService.parameter
    // //@ts-expect-error
    // this.featuresStoreService.setBuildingsToHide(this.object.parent.key, this.features[0].getProperties()['osmId'])
    window.open(url, '_blank')
  }

  canHideBuilding() {
    return this.parametersService.parameter.can_hide_buildings
  }

  hideBuilding() {
    //@ts-expect-error
    this.featuresStoreService.setBuildingsToHide(this.object.parent.key, this.feature.getProperties()['osmId'])
    this.closeModal.emit()
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
    if (this.feature && this.feature.getGeometry()) {
      const geometry = this.feature.getGeometry()
      // if (geometry.getType() == "Point" || geometry.getType() == "MultiPoint") {
      let ol_extent = buffer(geometry.getExtent(), geometry.getType() == "Point" ? 20 : 20)

      const coordinate = getCenter(ol_extent)

      new CartoHelper(this.map).panTo(new Vector3(
        coordinate[0],
        coordinate[1],
        0
      ))

      // } else {
      //   let cartoClass = new CartoHelper(this.map)
      //   cartoClass.zoomToExtent(CartoHelper.olGeometryToGiroExtent(geometry), 16)

      // }
    }
  }
}
