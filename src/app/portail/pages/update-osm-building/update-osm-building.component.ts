import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { catchError, EMPTY, filter, from, fromEvent, ReplaySubject, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { FeatureForSheet } from '../descriptive-sheet/descriptive-sheet.component';
import { BuildingProperties } from '../../../processing/building/type';
import { Map as OsmMap, View, VectorTileLayer, VectorTileSource, fromLonLat, getCenter, MVT, OSM, TileLayer, VectorLayer, VectorSource, Style, Fill, Stroke, Feature, Text, MapBrowserEvent } from "../../../ol-module"
import { WMTS, XYZ } from 'ol/source';
import { fromOpenLayerEvent } from '../../../shared/class/fromOpenLayerEvent';
import { getRenderPixel } from 'ol/render';
import RenderEvent from 'ol/render/Event';
import { getUid, Overlay } from 'ol';
import { OsmService, UpdateOSMInfo } from '../../../data/services/osm.service';
import { FeaturesStoreService } from '../../../data/store/features.store.service';
import { none } from 'ol/centerconstraint';
import { formatColor, formatFeatureAttributes, getOsmLink } from '../descriptive-sheet/building-sheet/utils';
import { AttributeInterface } from '../descriptive-sheet/osm-sheet/osm-sheet.component';
import { OSMUpdateStoreService } from '../../../data/store/osm-update.store.service';

const MAX_FEATURES_UPDATE_IN_BULK = 50

@Component({
  selector: 'app-update-osm-building',
  templateUrl: './update-osm-building.component.html',
  styleUrls: ['./update-osm-building.component.scss']
})
export class UpdateOsmBuildingComponent {
  diff_rnb_values = [
    {
      "value": "multiple",
      "description": "Identifiants RNB multiples pour un unique bâtiment OSM"
    },
    {
      "value": "splitted",
      "description": "Identifiants RNB unique pour de multiples bâtiments OSM"
    },
    {
      "value": "",
      "description": ""
    }
  ]

  osmForm = this.formBuilder.group({
    "rnb": new UntypedFormControl(null, Validators.required),
    "diff_rnb": new UntypedFormControl(null),
  })

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private readonly notifier: NotifierService;

  private _osmMapDivSwipe!: ElementRef<RadioNodeList>;
  private _osmMapDiv!: ElementRef<HTMLDivElement>;
  private _osmPopup!: ElementRef<HTMLDivElement>;

  protected _loading: boolean = false


  @Input() feature: Feature
  @Output() closeEditing: EventEmitter<void> = new EventEmitter<void>()

  featureToUpdate: Feature

  selectedFeature: AttributeInterface[]


  map: OsmMap

  rnbVectorLayer = new VectorTileLayer({
    declutter: true,
    source: new VectorTileSource({
      attributions:
        '© <a href="https://rnb.beta.gouv.fr">RNB</a> ' +
        '© <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap contributors</a>',
      format: new MVT(),
      url: "https://rnb-api.beta.gouv.fr/api/alpha/tiles/shapes/{x}/{y}/{z}.pbf"
    }),
    style: (feature) => {
      feature.getProperties()["id"] = parseInt(getUid(feature))
      const labelStyle = new Text({
        declutterMode: 'none',
        font: '12px Calibri,sans-serif',
        fill: new Fill({
          color: '#000',

        }),
        stroke: new Stroke({
          color: '#fff',
          width: 4,
        }),
        text: feature.getProperties()["rnb_id"],
      })

      const selectStyle = new Style({
        fill: new Fill({
          color: '#eeeeee',
        }),
        stroke: new Stroke({
          color: 'rgb(234, 6, 6)',
          width: 4,
        }),
        text: labelStyle
      });

      const commonStyle = new Style({
        fill: new Fill({
          color: '#ccc',
        }),
        stroke: new Stroke({
          color: '#000',
          width: 1,
        }),
        text: labelStyle
      });

      if (this.rnbVectorLayer.getProperties()["selectedFeatureId"] != undefined && this.rnbVectorLayer.getProperties()["selectedFeatureId"] === feature.getProperties()["id"]) {
        return selectStyle
      }

      return commonStyle
    }

  })

  buildingLayer = new VectorLayer({
    "style": { 'fill-color': "rgba(74, 244, 7, 0.4)" },
    source: new VectorSource({})
  })

  @ViewChild("osmMapDivSwipe") set osmMapDivSwipe(el: ElementRef<RadioNodeList>) {
    if (el) {
      this._osmMapDivSwipe = el;
      this.InitializeMap();
    }
  }

  @ViewChild('osmMapDiv') set osmMapDiv(el: ElementRef<HTMLDivElement>) {
    if (el) {
      this._osmMapDiv = el;
      this.InitializeMap();
    }

  }

  @ViewChild('osmPopup') set osmPopup(el: ElementRef<HTMLDivElement>) {
    if (el) {
      this._osmPopup = el;
      this.InitializeMap();
    }

  }


  updateOsmFeature: () => void
  saveAndGoToNextFeature: () => void
  getOsmLink: (feature: Feature) => string
  formatColor: (decimalColor: number) => string


  constructor(
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    private osmService: OsmService,
    private featuresStoreService: FeaturesStoreService,
    private osmUpdateStoreService: OSMUpdateStoreService
  ) {
    this.getOsmLink = getOsmLink
    this.formatColor = formatColor
    this.notifier = notifierService;

    this.saveAndGoToNextFeature = () => {
      this.osmUpdateStoreService.storeFeatureToInUpdate(
        {
          osm_id: this.featureToUpdate.getProperties()["osm_id"],
          osm_type: this.featureToUpdate.getProperties()["osm_type"],
          // geometry: this.featureToUpdate.getGeometry(),
          changes: {
            rnb: this.osmForm.get('rnb').value,
            diff_rnb: this.osmForm.get('diff_rnb').value,
          }
        }
      )

      this.featuresStoreService.changeBuildingFeature(
        {
          osm_id: this.featureToUpdate.getProperties()["osm_id"],
          changes: {
            rnb: this.osmForm.get('rnb').value,
            diff_rnb: this.osmForm.get('diff_rnb').value,
          },
          geometry: this.featureToUpdate.getGeometry()
        }
      )

      setTimeout(() => {
        this.goToNextFeature()
      }, 500);


    }

    const onUpdateOSmFeature: Subject<void> = new Subject()
    this.updateOsmFeature = () => {
      onUpdateOSmFeature.next()
    }

    // onUpdateOSmFeature.pipe(
    //   takeUntil(this.destroyed$),
    //   filter(() => this.osmForm.valid),
    //   filter(() => this.featureToUpdate.getProperties()["osm_id"] != undefined),
    //   switchMap(() => {
    //     this._loading = true
    //     const osmFeatureToUpdate: UpdateOSMInfo = {
    //       osm_id: Math.abs(this.featureToUpdate.getProperties()["osm_id"]),
    //       osm_type: this.featureToUpdate.getProperties()["osm_type"],
    //       rnb: this.osmForm.get('rnb').value,
    //     }
    //     if (this.osmForm.get('diff_rnb').value) {
    //       osmFeatureToUpdate.diff_rnb = this.osmForm.get('diff_rnb').value
    //     }
    //     return this.osmService.updateOSMFeature(osmFeatureToUpdate).pipe(
    //       catchError((error) => {
    //         this._loading = false
    //         if (error.error && typeof error.error === 'string') {
    //           this.notifier.notify('error', error.error)
    //         } else if (error.error && typeof error.error === 'object') {
    //           Object.keys(error.error).forEach(key => {
    //             let message = error.error[key]
    //             if (key != "__all__") {
    //               message += key + " : " + message
    //             }
    //             this.notifier.notify('error', message)
    //           })
    //         }
    //         return EMPTY
    //       }),
    //     )
    //   }),

    //   tap(() => {
    //     this._loading = false
    //     this.notifier.notify('success', 'Modification sauvegardée avec succès')
    //     const properties = this.featureToUpdate.getProperties()
    //     properties["rnb"] = this.osmForm.get('rnb').value
    //     properties["diff_rnb"] = this.osmForm.get('diff_rnb').value
    //     this.featureToUpdate.setProperties(properties)

    // this.featuresStoreService.reloadBuildingFeature(
    //   this.featureToUpdate.getProperties()["osm_id"],
    //   {
    //     rnb: this.osmForm.get('rnb').value,
    //     diff_rnb: this.osmForm.get('diff_rnb').value,
    //   },
    //   this.featureToUpdate.getGeometry()
    // )

    //     this.closeEditing.emit()
    //   })
    // ).subscribe()
  }

  canGoToNExtFeature(): [boolean, string] {
    return [this.osmUpdateStoreService.osmFeaturesInUpdate.length > MAX_FEATURES_UPDATE_IN_BULK, "Sauvegarder les " + this.osmUpdateStoreService.osmFeaturesInUpdate.length + " modifications avant de continuer"]
  }

  ignoreAndGoToNextFeature() {
    this.osmUpdateStoreService.storeIgnoredFeature(this.featureToUpdate.getProperties()["osm_id"])
    this.goToNextFeature()
  }

  goToNextFeature() {

    this.osmUpdateStoreService.getNextFeatureToUpdate(getCenter(this.feature.getGeometry().getExtent())).pipe(
      take(1),
      tap((feature) => {
        if (feature) {
          this.featureToUpdate = feature
          this.initializeFeatureAttributes()
          this.addAndZoomToFeature(this.featureToUpdate)
        } else {
          alert("no more feature to update")
          // this.closeEditing.emit()
        }
      })
    ).subscribe()
  }

  initializeFeatureAttributes() {
    this.selectedFeature = formatFeatureAttributes(this.featureToUpdate)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.feature.currentValue) {
      this.featureToUpdate = this.feature
      this.initializeFeatureAttributes()
      this.InitializeMap()
    }
  }

  openUrl(url) {
    window.open(url, '_blank')
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  private InitializeMap() {
    if (this._osmMapDiv && this._osmMapDivSwipe && this.featureToUpdate && this._osmPopup && !Boolean(this.map)) {

      const properties = this.featureToUpdate.getProperties() as BuildingProperties
      this.osmForm.get('rnb').setValue(properties.match_rnb_ids, { emitEvent: false })
      this.osmForm.get('diff_rnb').setValue(properties.match_rnb_diff)

      const center = getCenter(this.featureToUpdate.getGeometry().getExtent())
      this.map = new OsmMap({
        target: this._osmMapDiv.nativeElement,
        view: new View({
          center: center,
          minZoom: 15,
          maxZoom: 21,
          zoom: 17,
        }),
        layers: [
          new TileLayer({
            source: new XYZ({
              url: "https://tile.jawg.io/dark/{z}/{x}/{y}.png?api-key=community"
            })
          }),
          this.rnbVectorLayer,
          this.buildingLayer
        ]
      })


      this.addAndZoomToFeature(this.featureToUpdate)
      this.initializeMapSlider()
      this.initializeMouseEvent()
    }
  }

  addAndZoomToFeature(feature) {
    const properties = feature.getProperties() as BuildingProperties
    this.osmForm.get('rnb').setValue(properties.match_rnb_ids, { emitEvent: false })
    this.osmForm.get('diff_rnb').setValue(properties.match_rnb_diff)

    this.buildingLayer.getSource().clear()
    this.buildingLayer.getSource().addFeature(feature)
    this.map.getView().fit(feature.getGeometry().getExtent(), { padding: [50, 50, 50, 50] })
  }

  private initializeMouseEvent() {
    // @ts-expect-error
    fromOpenLayerEvent(this.map, "pointermove").pipe(
      takeUntil(this.destroyed$),
      tap((e) => {
        if (this.rnbVectorLayer.getProperties()['selectedFeatureId']) {
          this.rnbVectorLayer.setProperties({ 'selectedFeatureId': undefined })
          this.rnbVectorLayer.changed()
        }

        // @ts-expect-error
        this.map.forEachFeatureAtPixel(e.pixel, (f, lay) => {
          if (lay != this.rnbVectorLayer) {
            return false;
          }
          this.rnbVectorLayer.setProperties({ 'selectedFeatureId': f.getProperties()["id"] })
          this.rnbVectorLayer.changed()
          return true;
        });

      })
    ).subscribe()

    const overlay = new Overlay({
      element: this._osmPopup.nativeElement,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    this.map.addOverlay(overlay);

    const closer = this._osmPopup.nativeElement.getElementsByClassName("ol-popup-closer")[0]
    fromEvent(closer, "click").pipe(
      takeUntil(this.destroyed$),
      tap(() => {
        overlay.setPosition(undefined);
        return false;
      })
    ).subscribe()

    // @ts-expect-error
    fromOpenLayerEvent(this.map, "singleclick").pipe(
      takeUntil(this.destroyed$),
      tap((e) => {
        // @ts-expect-error
        const coordinate = e.coordinate;
        const content = this._osmPopup.nativeElement.getElementsByClassName("popup-content")[0];

        // @ts-expect-error
        this.map.forEachFeatureAtPixel(e.pixel, (f, lay) => {
          if (lay != this.rnbVectorLayer) {
            return false;
          }
          content.innerHTML = '<p style="font-weight: bold;" > ' + f.getProperties()["rnb_id"] + '</p>';
          overlay.setPosition(coordinate);

          return true;
        });

      })
    ).subscribe()
  }

  private initializeMapSlider() {
    this._osmMapDivSwipe.nativeElement.value = "10"

    fromOpenLayerEvent<RenderEvent>(this.buildingLayer, "prerender").pipe(
      takeUntil(this.destroyed$),
      tap((event) => {
        const ctx = event.context as CanvasRenderingContext2D;
        const mapSize = this.map.getSize();
        const width = mapSize[0] * (Number(this._osmMapDivSwipe.nativeElement.value) / 100);
        const tl = getRenderPixel(event, [width, 0]);
        const tr = getRenderPixel(event, [mapSize[0], 0]);
        const bl = getRenderPixel(event, [width, mapSize[1]]);
        const br = getRenderPixel(event, mapSize);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tl[0], tl[1]);
        ctx.lineTo(bl[0], bl[1]);
        ctx.lineTo(br[0], br[1]);
        ctx.lineTo(tr[0], tr[1]);
        ctx.closePath();
        ctx.clip();
      })
    ).subscribe()

    fromOpenLayerEvent<RenderEvent>(this.buildingLayer, "postrender").pipe(
      takeUntil(this.destroyed$),
      tap((event) => {
        const ctx = event.context as CanvasRenderingContext2D;
        ctx.restore();
      })
    ).subscribe()

    fromEvent(this._osmMapDivSwipe.nativeElement, "input").pipe(
      takeUntil(this.destroyed$),
      tap((value) => {
        this.map.render()
      })
    ).subscribe()
  }

}
