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
import { DescriptiveSheetComponent, FeatureForSheet } from '../descriptive-sheet.component';
import { catchError, EMPTY, map, Observable, ReplaySubject, Subject, take, takeUntil, tap } from 'rxjs';
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
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { environment } from '../../../../../environments/environment';
import { OsmService } from '../../../../data/services/osm.service';
import { OsmLoginComponent } from '../../../../modal/osm-login/osm-login.component';
import { MatomoTracker } from 'ngx-matomo-client';
import { formatColor, formatFeatureAttributes, getFields, getOsmLink } from './utils';
import { OSMUpdateStoreService } from '../../../../data/store/osm-update.store.service';

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

  isEditing = false

  private _oldModalContentHeight: number

  getOsmLink: (feature: Feature) => string
  formatColor: (decimalColor: number) => string
  constructor(
    public backendApiService: BackendApiService,
    private featuresStoreService: FeaturesStoreService,
    private parametersService: ParametersService,
    notifierService: NotifierService,
    public dialog: MatDialog,
    private osmService: OsmService,
    private cdRef: ChangeDetectorRef,
    private readonly tracker: MatomoTracker,
    private osmUpdateStoreService: OSMUpdateStoreService
  ) {
    this.getOsmLink = getOsmLink
    this.formatColor = formatColor
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.selectedFeature$ = onInit.pipe(
      map(() => {
        const instance = this.map.instance
        const properties = (this.feature.getProperties() as BuildingProperties)
        const parentAndChildren = properties.parent_and_children ?? undefined
        if (Boolean(parentAndChildren) == true) {
          console.log(JSON.parse(parentAndChildren).find((c) => {
            return (c.role == 'outer' || c.role == 'outline')
          }))
        }
        // @ts-expect-error
        if (this.object && this.object.isSelectable == true) {
          // @ts-expect-error
          this.object.setFeatureUidSelected(properties.osm_id)
          instance.notifyChange([this.object])
        }
        const buildingCount = parseInt(localStorage.getItem("buildingCount")) || 0
        if (buildingCount > 3 && this.should_display_rnb_edit()) {
          this.startEditBuilding()
        }
        return formatFeatureAttributes(this.feature)
      })
    )
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

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

  should_display_rnb_edit() {
    if (!this.osmUpdateStoreService.isOsmBuildingUpdateEnabled) {
      return false
    }
    if (CartoHelper.isMobile()) {
      return false
    }
    if (this.feature === undefined) {
      return false
    }
    const properties = this.feature.getProperties() as BuildingProperties

    // if (Boolean(properties.building) == false) {
    //   return false
    // }
    if (properties.rnb) {
      return false
    }

    if (properties.match_rnb_ids) {
      return true
    }
    return false

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
    window.open(url, '_blank')
  }

  canHideBuilding() {
    return this.parametersService.parameter.can_hide_buildings
  }

  hideBuilding() {
    //@ts-expect-error
    this.featuresStoreService.setBuildingsToHide(this.object.parent.key, this.feature.getProperties()['osm_id'])
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
      let ol_extent = buffer(geometry.getExtent(), geometry.getType() == "Point" ? 20 : 20)

      const coordinate = getCenter(ol_extent)

      new CartoHelper(this.map).panTo(new Vector3(
        coordinate[0],
        coordinate[1],
        0
      ))

    }
  }

  getOsmUserInfo() {
    return this.osmService.getOsmUserInfo()
  }

  stopEditBuilding() {
    this.isEditing = false
    this.onInitInstance()
    for (let index = 0; index < this.dialog.openDialogs.length; index++) {
      const elementDialog = this.dialog.openDialogs[index];

      if (elementDialog.componentInstance instanceof DescriptiveSheetComponent && document.getElementById(elementDialog.id) && document.getElementById(elementDialog.id).parentElement) {
        elementDialog.updateSize(
          (window.innerWidth / 3) + "px",
          (window.innerHeight / 3) + "px"
        )
        elementDialog.updatePosition({
          top: '60px',
          left: (window.innerWidth / 2 - 400 / 2) + 'px'
        })
        try {
          // @ts-expect-error
          elementDialog._containerInstance._elementRef.nativeElement.querySelector(".building-descriptive-sheet-content").style.setProperty("height", (this._oldModalContentHeight || 300) + "px", "important")
        } catch (error) {

        }
        // @ts-expect-error
        elementDialog._containerInstance._elementRef.nativeElement.parentElement.style.maxHeight = window.innerHeight + "px"

      }
    }
  }

  startEditBuilding() {
    this.tracker.trackEvent("edit", "building")

    this.getOsmUserInfo().pipe(
      takeUntil(this.destroyed$),
      catchError((error) => {
        this.dialog.open(OsmLoginComponent, { minWidth: 400 })
        return EMPTY
      }),
      tap(() => {
        for (let index = 0; index < this.dialog.openDialogs.length; index++) {
          const elementDialog = this.dialog.openDialogs[index];

          if (elementDialog.componentInstance instanceof DescriptiveSheetComponent && document.getElementById(elementDialog.id) && document.getElementById(elementDialog.id).parentElement) {
            elementDialog.updateSize(
              (window.innerWidth / 2) + "px",
              window.innerHeight + "px"
            )
            elementDialog.updatePosition({
              top: "0px",
              left: "0px"
            })
            try {

              // @ts-expect-error 
              this._oldModalContentHeight = elementDialog._containerInstance._elementRef.nativeElement.querySelector(".building-descriptive-sheet-content").clientHeight
              // @ts-expect-error
              elementDialog._containerInstance._elementRef.nativeElement.querySelector(".building-descriptive-sheet-content").style.setProperty("height", (window.innerHeight - 80) + "px", "important")
            } catch (error) {

            }
            // @ts-expect-error
            elementDialog._containerInstance._elementRef.nativeElement.parentElement.style.maxHeight = window.innerHeight + "px"

            this.isEditing = true
            const buildingCount = parseInt(localStorage.getItem("buildingCount")) || 0
            localStorage.setItem("buildingCount", (buildingCount + 1).toString())
          }
        }
      })
    ).subscribe()


  }
}
