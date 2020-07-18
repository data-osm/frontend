import { Component, OnInit, Input, NgZone } from '@angular/core';
import {
  Map, Draw, VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, Modify, Feature, unByKey, Overlay, Select,Text
} from '../../../../ol-module';
import { environment } from 'src/environments/environment';
import * as $ from 'jquery'
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { manageDataHelper } from '../../../../../helper/manageData'
import { cartoHelper } from '../../../../../helper/carto.helper'
import { NotifierService } from "angular-notifier";
import { TranslateService } from '@ngx-translate/core';

export interface drawToolInterace {
  active: boolean,
  features: Array<Feature>
}

export interface modifyToolTypeInterface {
  active: boolean
}
export interface modifyToolInterface {
  active: boolean,
  geometry: modifyToolTypeInterface
  comment: modifyToolTypeInterface
  color: modifyToolTypeInterface
  delete: modifyToolTypeInterface
  interactions: Array<any>
  key: Array<any>
}

export interface propertiesFeatureInterface {
  comment: string,
  color: string
  /**
   * id of feature
   */
  featureId: string
}

/**
 * Draw tools
 */
@Component({
  selector: 'app-draw',
  templateUrl: './draw.component.html',
  styleUrls: ['./draw.component.scss']
})
export class DrawComponent implements OnInit {

  @Input() map: Map

  environment

  /**
   * main color of the app
   */
  primaryColor: string = environment.primaryColor



  /**
   * VectorSource of draw interaction
   */
  source: VectorSource = new VectorSource();
  /**
   * VectorLayer of draw interaction
   */
  vector: VectorLayer = new VectorLayer({
    source: this.source,
    style: (feature)=>{
      var color = this.primaryColor
      if (feature.get('color')) {
        color = feature.get('color')
      }
      return new Style({
        fill: new Fill({
          color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.7]
        }),
        stroke: new Stroke({
          color: color,
          width: 2
        }),
        image: new CircleStyle({
          radius: 7,
          stroke: new Stroke({
            color: color,
            width: 2
          }),
          fill: new Fill({
            color: [this.hexToRgb(color).r, this.hexToRgb(color).g, this.hexToRgb(color).b, 0.7]
          })
        }),
        text: new Text({
          font: 'bold 18px Calibri,sans-serif',
          fill: new Fill({
            color: color
          }),
          text: feature.get('comment'),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        })
      })
    },
    type: 'draw',
    name: 'draw'
  });

  /**
   * draw interaction
   */
  draw: Draw

  /**
   * Modify interaction
   */
  modify: Modify = new Modify({
    source: this.source ,
    style: new Style({
      fill: new Fill({
        color: [255, 0, 255, 0.7]
      }),
      stroke: new Stroke({
        color: [255, 0, 255, 1],
        width: 2
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: [255, 0, 255, 0.7]
        }),
        stroke: new Stroke({
          color: [255, 0, 255, 1],
          width: 2
        }),
      })
    }),
  });

  /**
   * Select interaction
   */
  select: Select = new Select({
    layers: [this.vector],
    style: new Style({
      fill: new Fill({
        color: [255, 255, 0, 0.7]
      }),
      stroke: new Stroke({
        color: '#ffff00',
        width: 2
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: [255, 255, 0, 0.7]
        }),
        stroke: new Stroke({
          color: '#ffff00',
          width: 2
        }),
      })
    }),
  })


   /**
   * Overlay for edit color of feature
   */

  overlayColor: Overlay = new Overlay({
    position: undefined,
    positioning: 'top-left',
    element: document.getElementById('overlay-draw-color'),
    stopEvent: true
  });

   /**
   * Overlay for edit properties of feature
   * like a text, comment, etc...
   */

  overlay: Overlay = new Overlay({
    position: undefined,
    positioning: 'top-left',
    element: document.getElementById('overlay-draw-text'),
    stopEvent: true
  });
  /**
   * Formgroup for edit properties of feature
   */
  formulaireText: FormGroup

  /**
   * Differents type of draw
   */
  drawTools: { 'Point': drawToolInterace, 'LineString': drawToolInterace, 'Polygon': drawToolInterace, 'key': Array<any> } = {
    'Point': {} as drawToolInterace, 'LineString': {} as drawToolInterace, 'Polygon': {} as drawToolInterace, key: []
  }

  /**
   *
   * different type of modification
   */
  modifyTool: modifyToolInterface = {
    active: false, geometry: { active: false },
    comment: { active: false },
    color: { active: false },
    delete: { active: false },
    interactions: [],
    key: []
  }

  private readonly notifier: NotifierService;

  constructor(
    public _ngZone: NgZone,
    public fb: FormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
  ) {
    this.environment = environment
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    this.map.addOverlay(this.overlay);
    this.map.addOverlay(this.overlayColor);
    this.map.addLayer(this.vector)
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
  /**
   * VALUE OF THE COLOR PICKER CHANGED
   * @param new_color {value:string}
   */
  colorChanged(new_color:string){
    this.formulaireText.controls['color'].setValue(new_color)
  }

  /**
   * Get a draw tool
   * @param type 'Point'|'LineString'|'Polygon'
   */
  getDrawTool(type: 'Point' | 'LineString' | 'Polygon'): drawToolInterace {
    return this.drawTools[type]
  }

  /**
   * Get modification tool
   * @param type 'geometry'|'comment'|'color'|'delete'
   */
  getModifyTool(type: 'geometry' | 'comment' | 'color' | 'delete'): modifyToolTypeInterface {
    return this.modifyTool[type]
  }

  /**
   * construct a new FormGroup for the properties of a feature :
   * @param properties propertiesFeatureInterface
   */
  constructFormText(properties: propertiesFeatureInterface) {
    if (!this.formulaireText) {
      this.formulaireText = this.fb.group({})
    }

    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        const element = properties[key];
        if (this.formulaireText.controls[key]) {
          this.formulaireText.controls[key].setValue(element)
        } else {
          this.formulaireText.addControl(key, new FormControl(element))
        }
      }
    }

  }

  /**
   * Show overlay for add or edit properties of a feature
   * @param coordinates Array<number> positionn of the overlay
   */
  showOverlay(coordinates: Array<number>) {
    if (!this.overlay.getElement()) {
      this.overlay.setElement(document.getElementById('overlay-draw-text'))
    }
    this.overlay.setPosition(coordinates)
    $('#overlay-draw-text').show()
  }

  /**
   * Hide overlay that it is use to  add or edit properties of a feature
   */
  hideOverlay() {
    $('#overlay-draw-text').hide()
  }

  /**
   * Hide overlay of color
   */
  hideOverlayColor(){
    $('#overlay-draw-color').hide()
  }

  /**
   * Save properties of formbuilder in feature properties and close overlay
   */
  saveFormToFeaturePte() {
    if (this.formulaireText.controls['featureId']) {
      console.log(this.formulaireText.getRawValue())
      var feature = this.source.getFeatureById(this.formulaireText.controls['featureId'].value)
      for (const key in this.formulaireText.getRawValue()) {
        if (this.formulaireText.getRawValue().hasOwnProperty(key)) {
          const element = this.formulaireText.getRawValue()[key];
          feature.set(key, element)
        }
      }
    }
    this.hideOverlay()
    this.hideOverlayColor()
  }

  /**
   * Add a draw interaction
   * @param type 'Point'|'LineString'|'Polygon'
   */
  addInteractions(type: 'Point' | 'LineString' | 'Polygon') {
    this.draw = new Draw({
      source: this.source,
      type: type
    });
    this.map.addInteraction(this.draw);

    var keyEventStart = this.draw.on('drawstart', (DrawEvent: any) => {
      this._ngZone.run(() => {
        this.hideOverlay()
      })

    })

    var keyEventEnd = this.draw.on('drawend', (DrawEvent: any) => {
      this._ngZone.run(() => {
        var drawFeature: Feature = DrawEvent.feature
        let featureId = manageDataHelper.makeid()
        let allFeatureIds = cartoHelper.listIdFromSource(this.source)

        while (allFeatureIds.indexOf(featureId) != -1) {
          featureId = manageDataHelper.makeid()
        }

        drawFeature.setId(featureId)
        let positionOfOverlay = drawFeature.getGeometry().getLastCoordinate()

        this.constructFormText({
          comment: '',
          color: this.primaryColor,
          featureId: featureId
        })

        this.showOverlay(positionOfOverlay)
      })
    })

    this.drawTools.key.push(keyEventStart)
    this.drawTools.key.push(keyEventEnd)

  }

  /**
   * set active to false to all tool of draw geometry
   */
  desactivateAllAddTool() {
    for (const key in this.drawTools) {
      if (this.drawTools.hasOwnProperty(key) && key != 'key') {
        const element = this.drawTools[key];
        element.active = false
      }
    }
    this.removeAddInteraction()
  }

  /**
   * Remove add geometry interaction
   */
  removeAddInteraction() {
    this.map.removeInteraction(this.draw);
    for (let index = 0; index < this.drawTools.key.length; index++) {
      const element = this.drawTools.key[index];
      unByKey(element)

    }
    this.draw = undefined
  }


  /**
   * Add or remove draw interaction
   * @param type 'Point'|'LineString'|'Polygon'
   */
  toogleAddDraw(type: 'Point' | 'LineString' | 'Polygon') {
    this.desactivateAllModificationTool()
    if (this.drawTools[type].active) {
      this.desactivateAllAddTool()
      this.drawTools[type].active = false
    } else {
      if (this.draw) {
        this.desactivateAllAddTool()
      }
      this.addInteractions(type)
      this.drawTools[type].active = true
    }

  }

  /**
   * Activate modification of draw
   * Will fire on only if there is already features that have been draw
   * will remove interaction of the draw one if exists
   */
  toogleModifyDraw() {
    if (this.source.getFeatures().length > 0) {

      if (this.modifyTool.active) {
        this.modifyTool.active = false

        this.desactivateAllModificationTool()
      } else {
        this.desactivateAllAddTool()
        this.modifyTool.active = true
      }

    }else{
      this.translate.get('draw_in_map', { value: 'caracteristique' }).subscribe((res: any) => {
        this.notifier.notify("default", res.no_draw_features);
      });
    }

  }

  /**
   * Remove all modification interaction and key event:
   * clear all from from this.modifyTool.interactions and this.modifyTool.key
   */
  removeAllModifiactionInteraction(){
    for (let index = 0; index < this.modifyTool.interactions.length; index++) {
      this.map.removeInteraction(this.modifyTool.interactions[index])
    }

    for (let index = 0; index < this.modifyTool.key.length; index++) {
      unByKey(this.modifyTool.key[index])
    }

    this.modifyTool.interactions = []
    this.modifyTool.key = []
  }

  /**
   * Desactivate all mode of the modification mode
   */
  desactivateAllModificationTool(){
    this.modifyTool.geometry.active = false
    this.modifyTool.comment.active = false
    this.modifyTool.color.active = false
    this.modifyTool.delete.active = false
    $('#overlay-draw-color').hide()
    this.removeAllModifiactionInteraction()
  }

  /**
   * Modify draw features
   * @param type 'geometry'|'comment'|'color'|'delete'
   */
  modifyDraw(type: 'geometry' | 'comment' | 'color' | 'delete') {

    if (type=='comment') {
      this.toogleModifyDrawComment()
    }else if (type=='geometry') {
      this.toogleModifyDrawGeometry()
    }else if (type=='delete') {
      this.toogleModifyDeleteFeature()
    }else if (type == 'color'){
      this.toogleModifyDrawColor()
    }
  }

  /**
   * Active/desactivate edition that permit modification of comment of features
   */
  toogleModifyDrawComment() {

    if (this.modifyTool.comment.active) {
      this.desactivateAllModificationTool()

    } else {
      this.desactivateAllModificationTool()

      this.modifyTool.comment.active = true

      this.map.addInteraction(this.select)

      var keyEventSelect = this.select.on('select', (SelectEvent: any) => {
        let selectFeatures: Array<Feature> = SelectEvent.selected

        if (selectFeatures.length > 0) {
          var feature = selectFeatures[0]

          let positionOfOverlay = feature.getGeometry().getLastCoordinate()

          this.constructFormText({
            comment: feature.get('comment') ? feature.get('comment') : '',
            color: feature.get('color') ? feature.get('color') : undefined,
            featureId: feature.getId()
          })

          this.showOverlay(positionOfOverlay)

        }

        var features = this.select.getFeatures();
        features.clear();
      })

      this.modifyTool.interactions.push(this.select)
      this.modifyTool.key.push(keyEventSelect)
    }
  }

  /**
   * Activate/desactivate geometric edition of features that have been draw
   */

   toogleModifyDrawGeometry(){
    if (this.modifyTool.geometry.active) {
      this.desactivateAllModificationTool()
    } else {
      this.desactivateAllModificationTool()

      this.modifyTool.geometry.active = true

      this.map.addInteraction(this.modify)
      this.modifyTool.interactions.push(this.modify)
    }
   }

   /**
   * Activate/desactivate delete feature from freatures that have been draw
   */
  toogleModifyDeleteFeature(){
    if (this.modifyTool.geometry.active) {
      this.desactivateAllModificationTool()
    } else {
      this.desactivateAllModificationTool()

      this.modifyTool.delete.active = true

      this.map.addInteraction(this.select)

      var keyEventSelect = this.select.on('select', (SelectEvent: any) => {
        let selectFeatures: Array<Feature> = SelectEvent.selected
        if (selectFeatures.length > 0) {
          var feature = selectFeatures[0]
          this.source.removeFeature(feature)
        }
      })

      this.modifyTool.interactions.push(this.select)
      this.modifyTool.key.push(keyEventSelect)
    }
  }

    /**
   * Activate/desactivate color edition of features that have been draw
   */

  toogleModifyDrawColor(){
    if (this.modifyTool.geometry.active) {
      this.desactivateAllModificationTool()
    } else {
      this.desactivateAllModificationTool()

      this.modifyTool.color.active = true


      this.map.addInteraction(this.select)

      var keyEventSelect = this.select.on('select', (SelectEvent: any) => {
        let selectFeatures: Array<Feature> = SelectEvent.selected
        if (selectFeatures.length > 0) {
          var feature = selectFeatures[0]
          let positionOfOverlay = feature.getGeometry().getLastCoordinate()
          if (!this.overlayColor.getElement()) {
            this.overlayColor.setElement(document.getElementById('overlay-draw-color'))
          }

          this.constructFormText({
            comment: feature.get('comment') ? feature.get('comment') : '',
            color: feature.get('color') ? feature.get('color') : undefined,
            featureId: feature.getId()
          })

          this.overlayColor.setPosition(positionOfOverlay)
          $('#overlay-draw-color').show()

          var features = this.select.getFeatures();
          features.clear();

        }
      })

      this.modifyTool.interactions.push(this.select)
      this.modifyTool.key.push(keyEventSelect)

    }
   }
  /**
   * Share all draw :
   * Will save all draw id DB, return the unique ID of the draw
   */
  shareAllDraw() {

  }

  /**
   * Clear all draw
   */
  deleteleAllDraw() {
    this.source.clear()
  }
}
