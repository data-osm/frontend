import { Component, OnInit, Input, NgZone } from '@angular/core';
import {
  Map, Draw, VectorSource, VectorLayer, Style, Fill, Stroke, CircleStyle, Modify, Feature, unByKey, Overlay, Select, Text, GeoJSON, Polygon, LineString, getLength, getArea, Circle
} from '../../../../ol-module';
import { environment } from 'src/environments/environment';
import * as $ from 'jquery'
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { manageDataHelper } from '../../../../../helper/manage-data.helper'
import { cartoHelper } from '../../../../../helper/carto.helper'
import { NotifierService } from "angular-notifier";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-measure',
  templateUrl: './measure.component.html',
  styleUrls: ['./measure.component.scss']
})
export class MeasureComponent implements OnInit {

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
    style: (feature) => {
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
    type: 'measure',
    name: 'measure'
  });

  /**
   * draw interaction
   */
  draw: Draw


  /**
   * Currently drawn feature.
   * @type {import("../src/ol/Feature.js").default}
   */
  sketch;


  /**
   * The help tooltip element.
   * @type {HTMLElement}
   */
  helpTooltipElement: HTMLElement;


  /**
   * Overlay to show the help messages.
   * @type {Overlay}
   */
  helpTooltip: Overlay;


  /**
   * The measure tooltip element.
   * @type {HTMLElement}
   */
  measureTooltipElement: HTMLElement;


  /**
   * Overlay to show the measurement.
   * @type {Overlay}
   */
  measureTooltip: Overlay;


  /**
   * Message to show when the user is drawing a polygon.
   * @type {string}
   */
  continuePolygonMsg: string = 'Click to continue drawing the polygon';


  /**
   * Message to show when the user is drawing a line.
   * @type {string}
   */
  continueLineMsg: string = 'Click to continue drawing the line';

  event_measure

  constructor(
    public _ngZone: NgZone,
    public fb: FormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
  ) {
    this.environment = environment
  }

  ngOnInit(): void {
    this.map.addLayer(this.vector)



    this.translate.get('right_menu').subscribe((res: any) => {
      console.log(res)
      this.continuePolygonMsg = res.tools.mesure.continuePolygonMsg
      this.continueLineMsg = res.tools.mesure.continueLineMsg
    });
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
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
  pointerMoveHandler(evt) {
    if (evt.dragging) {
      return;
    }
    /** @type {string} */
    var helpMsg = 'Click to start drawing';

    this.translate.get('right_menu').subscribe((res: any) => {
      helpMsg = res.tools.mesure.helpSrartMeasure
    });


    if (this.sketch) {
      var geom = this.sketch.getGeometry();
      if (geom instanceof Polygon || geom instanceof Circle ) {
        helpMsg = this.continuePolygonMsg;
      } else if (geom instanceof LineString) {
        helpMsg = this.continueLineMsg;
      }
    }

    this.helpTooltipElement.innerHTML = helpMsg;
    this.helpTooltip.setPosition(evt.coordinate);

    this.helpTooltipElement.classList.remove('hidden');
  };

  /**
   * Format length output.
   * @param {LineString} line The line.
   * @return {string} The formatted length.
   */
  formatLength(line) {
    // var length = getLength(line);
    if (line.getType() == 'Circle') {
      var length: number = line.getRadius()
    } else {
      var length = getLength(line);
    }

    var output;
    if (length > 100) {
      output = (Math.round(length / 1000 * 100) / 100) +
        ' ' + 'km';
    } else {
      output = (Math.round(length * 100) / 100) +
        ' ' + 'm';
    }
    return output;
  };
  listener
  /**
   * Format area output.
   * @param {Polygon} polygon The polygon.
   * @return {string} Formatted area.
   */
  formatArea(polygon) {
    var area = getArea(polygon);
    var output;
    if (area > 10000) {
      output = (Math.round(area / 1000000 * 100) / 100) +
        ' ' + 'km<sup>2</sup>';
    } else {
      output = (Math.round(area * 100) / 100) +
        ' ' + 'm<sup>2</sup>';
    }
    return output;
  };

  measureModel:{
    Polygon:{active:boolean}
    LineString:{active:boolean}
    Circle:{active:boolean}
  }={
    Polygon:{active:false},
    LineString:{active:false},
    Circle:{active:false},
  }

  /**
   * Remove all interaction and other object to the apps
   * NB this function does not cleqnd features and toolpit, use clearDraw for that purpose
   */
  removeMeasureToApps(){
    this.map.removeInteraction(this.draw);
    this.sketch = null;
        // unset tooltip so that a new one can be created
        this.helpTooltipElement = null;
        this.measureTooltipElement = null;
    unByKey(this.listener);
    unByKey(this.event_measure);
    this.map.removeOverlay(this.measureTooltip);
    this.map.removeOverlay(this.helpTooltip);

  }

  /**
   * Remove all interaction and other object to the apps
   */
  clearDraw(){
    this.removeMeasureToApps();
    if (document.querySelectorAll('.tooltip.tooltip-measure').length > 0) {
      $('.tooltip.tooltip-measure').hide()
    }
    this.source.clear()
  }

  /**
   * Activate/desactivate measure tools
   * @param type
   */
  toogleMeasureInteraction(type: 'Polygon' | 'LineString'| 'Circle'){

    if(this.measureModel[type].active){
      this.clearDraw()
    }else{
      console.log(type)
      this.addInteraction(type)
    }
    this.measureModel[type].active = !this.measureModel[type].active

    for (const key in this.measureModel) {
      if (this.measureModel.hasOwnProperty(key) && key != type) {
        const element = this.measureModel[key];
        element.active = false
      }
    }
  }

  /**
   * Add interaction for measure
   * @param type
   */
  addInteraction(type: 'Polygon' | 'LineString'| 'Circle') {
    this.removeMeasureToApps();
    this.event_measure  = this.map.on('pointermove', (evt) => {
      this._ngZone.run(() => {
        this.pointerMoveHandler(evt)
      })
    });

    // this.map.getViewport().addEventListener('mouseout', () => {
    //   this._ngZone.run(() => {
    //     this.helpTooltipElement.classList.add('hidden');
    //   })

    // });
    this.draw = new Draw({
      source: this.source,
      type: type,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.5)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)'
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        })
      })
    });

    this.map.addInteraction(this.draw);

    this.createMeasureTooltip();
    this.createHelpTooltip();


    this.draw.on('drawstart',
      (evt) => {
        // set sketch
        this.sketch = evt.feature;

        /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
        var tooltipCoord = evt.coordinate;

        this.listener = this.sketch.getGeometry().on('change',  (evt) =>{
          var geom = evt.target;
          var output;
          if (geom instanceof Polygon) {
            output = this.formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
          } else if (geom instanceof LineString || geom instanceof Circle) {
            output = this.formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();
            if (geom instanceof Circle) {
              tooltipCoord = geom.getCenter();
            }
          }
          this.measureTooltipElement.innerHTML = output;
          this.measureTooltip.setPosition(tooltipCoord);
        });
      });

    this.draw.on('drawend',
      () => {
        this.measureTooltipElement.className = 'tooltip tooltip-measure';
        this.measureTooltip.setOffset([0, -7]);
        // unset sketch
        this.sketch = null;
        // unset tooltip so that a new one can be created
        this.measureTooltipElement = null;
        this.createMeasureTooltip();
        unByKey(this.listener);
      });

  }


/**
 * Creates a new help tooltip
 */
 createHelpTooltip() {
  if (this.helpTooltipElement) {
    this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
  }
  this.helpTooltipElement = document.createElement('div');
  this.helpTooltipElement.className = 'tooltip hidden';
  this.helpTooltip = new Overlay({
    element: this.helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left'
  });
  this.map.addOverlay(this.helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
 createMeasureTooltip() {
  if (this.measureTooltipElement) {
    this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
  }
  this.measureTooltipElement = document.createElement('div');
  this.measureTooltipElement.className = 'tooltip tooltip-measure';
  this.measureTooltip = new Overlay({
    element: this.measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this.map.addOverlay(this.measureTooltip);
}

}
