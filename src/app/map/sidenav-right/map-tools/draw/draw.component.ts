import { Component, OnInit, Input, NgZone } from '@angular/core';
import {
  Map, Draw, VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, Modify, Feature, unByKey, Overlay,
} from '../../../../ol-module';
import { environment } from 'src/environments/environment';
import * as $ from 'jquery'
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import {manageDataHelper} from '../../../../../helper/manageData'
import {cartoHelper} from '../../../../../helper/carto.helper'

export interface drawToolInterace {
  active: boolean,
  features: Array<Feature>
}

export interface modifyToolTypeInterface{
  active: boolean
}
export interface modifyToolInterface {
  active: boolean,
  geometry: modifyToolTypeInterface
  comment: modifyToolTypeInterface
  color: modifyToolTypeInterface
  delete: modifyToolTypeInterface
}

export interface propertiesFeatureInterface{
  comment:string,
  color:string
  /**
   * id of feature
   */
  featureId:string
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
    style: new Style({
      fill: new Fill({
        color: [this.hexToRgb(this.primaryColor).r, this.hexToRgb(this.primaryColor).g, this.hexToRgb(this.primaryColor).b, 0.7]
      }),
      stroke: new Stroke({
        color: this.primaryColor,
        width: 2
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: this.primaryColor
        })
      })
    }),
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
  modify: Modify = new Modify({ source: this.source });

  /**
   * Overlay for edit properties of feature
   * like a text, comment, etc...
   */

  overlay:Overlay = new Overlay({
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
    delete: { active: false }
  }


  constructor(
    public _ngZone: NgZone,
    public fb: FormBuilder,
  ) {
    this.environment = environment

  }

  ngOnInit(): void {
    this.map.addOverlay(this.overlay);
    this.map.addLayer(this.vector)
    // this.map.addInteraction(this.modify)
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
  getModifyTool(type:'geometry'|'comment'|'color'|'delete'):modifyToolTypeInterface{
    return this.modifyTool[type]
  }

  /**
   * construct a new FormGroup for the properties of a feature :
   * @param properties propertiesFeatureInterface
   */
  constructFormText(properties:propertiesFeatureInterface){
    if (!this.formulaireText) {
      this.formulaireText =this.fb.group({})
    }

    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        const element = properties[key];
        if (this.formulaireText.controls[key]) {
          this.formulaireText.controls[key].setValue(element)
        }else{
          this.formulaireText.addControl(key,new FormControl(element))
        }
      }
    }

  }

  /**
   * Show overlay for add or edit properties of a feature
   * @param coordinates Array<number> positionn of the overlay
   */
  showOverlay(coordinates:Array<number>){
    if (!this.overlay.getElement()) {
      this.overlay.setElement(document.getElementById('overlay-draw-text'))
    }
    this.overlay.setPosition(coordinates)
    $('#overlay-draw-text').show()
  }

  /**
   * Hide overlay that it is use to  add or edit properties of a feature
   */
  hideOverlay(){
    $('#overlay-draw-text').hide()
  }

  /**
   * Save properties of formbuilder in feature properties and close overlay
   */
  saveFormToFeaturePte(){
    if (this.formulaireText.controls['featureId']) {
      console.log(this.formulaireText.getRawValue())
      var feature = this.source.getFeatureById(this.formulaireText.controls['featureId'].value)
      for (const key in this.formulaireText.getRawValue()) {
        if (this.formulaireText.getRawValue().hasOwnProperty(key)) {
          const element = this.formulaireText.getRawValue()[key];
          feature.set(key,element)
        }
      }
    }
    this.hideOverlay()
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

    var keyEventStart = this.draw.on('drawstart', (DrawEvent: any) =>{
      this._ngZone.run(() => {
        this.hideOverlay()
      })

    })

    var keyEventEnd = this.draw.on('drawend', (DrawEvent: any) => {
      this._ngZone.run(() => {
        var drawFeature: Feature = DrawEvent.feature
        let featureId = manageDataHelper.makeid()
        let allFeatureIds = cartoHelper.listIdFromSource(this.source)

        while (allFeatureIds.indexOf(featureId) != -1 ) {
          featureId = manageDataHelper.makeid()
        }

        drawFeature.setId(featureId)
        let positionOfOverlay = drawFeature.getGeometry().getLastCoordinate()

        this.constructFormText({
          comment:'',
          color:'',
          featureId:featureId
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
  desactivateAllAddTool(){
    for (const key in this.drawTools) {
      if (this.drawTools.hasOwnProperty(key) && key != 'key') {
        const element = this.drawTools[key];
        element.active = false
      }
    }
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
    this.desactivateAllAddTool()
    this.draw = undefined
  }


  /**
   * Add or remove draw interaction
   * @param type 'Point'|'LineString'|'Polygon'
   */
  toogleAddDraw(type: 'Point' | 'LineString' | 'Polygon') {
    if (this.drawTools[type].active) {
      this.removeAddInteraction()
      this.drawTools[type].active = false
    } else {
      if (this.draw) {
        this.removeAddInteraction()
      }
      this.addInteractions(type)
      this.drawTools[type].active = true
    }

  }

  /**
   * Activate modification of draw
   * Will fire on only if there is alreqdy features that have been draw
   * will remove all interaction of the draw one if exists
   */
  toogleModifyDraw(){
    if (this.source.getFeatures().length > 0) {
      this.removeAddInteraction()
      // this.desactivateAllAddTool()
    }

  }

  /**
   * Modify draw features
   * @param type 'geometry'|'comment'|'color'|'delete'
   */
  modifyDraw(type:'geometry'|'comment'|'color'|'delete'){

  }

  /**
   * Share all draw :
   * Will save all draw id DB, return the unique ID of the draw
   */
  shareAllDraw(){

  }

  /**
   * Clear all draw
   */
  deleteleAllDraw(){
    this.source.clear()
  }
}
