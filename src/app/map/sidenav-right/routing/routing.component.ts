import { Component, OnInit, Input, NgZone } from '@angular/core';
import {
  Map, VectorSource, VectorLayer, Style, Icon, Stroke, Draw, Circle, Fill, Feature, Transform, Point, Polyline, CircleStyle, unByKey
} from '../../../ol-module';
import { environment } from 'src/environments/environment';
import { cartoHelper } from 'src/helper/carto.helper';
import { TranslateService } from '@ngx-translate/core';
import * as $ from 'jquery'
import * as moment from 'moment'

@Component({
  selector: 'app-routing',
  templateUrl: './routing.component.html',
  styleUrls: ['./routing.component.scss']
})
export class RoutingComponent implements OnInit {

  @Input() map: Map

  /**
   * layer that contains all routing geometry
   * - roads
   * - marker
   */
  layerRouting: VectorLayer

  sourceRouting: VectorSource

  drawRouting: Draw

  data_itineraire = {
    "depart": {
      "nom": "",
      "coord": [],
      "set": false
    },
    "destination": {
      "nom": "",
      "coord": [],
      "set": false
    },
    "route": {
      "loading": false,
      "set": false,
      "data": undefined
    }
  }

  constructor(
    public translate: TranslateService,
    public _ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.inittialiseRouting()
  }

  /**
   * initialise routing:
   * - create and add routing layer to the map
   */
  inittialiseRouting() {
    this.sourceRouting = new VectorSource({ wrapX: false });
    this.layerRouting = new VectorLayer({
      source: this.sourceRouting,
      style: (feature: Feature) => {
        if (feature.getGeometry().getType() == 'Point') {

          if (feature.get('data') == "depart") {
            return new Style({
              image: new Icon({
                src: "assets/icones/routing/depart.svg",
                scale: 2,
              })
            })
          } else {
            return new Style({
              image: new Icon({
                src: "assets/icones/routing/itineraire-arrivee_icone.svg",
                scale: 1,
              })
            })
          }
        } else {
          return new Style({
            stroke: new Stroke({
              width: 6,
              color: environment.primaryColor
            })
          })
        }
      },
      type_layer: 'routing',
      nom: 'routing'
    });

    this.layerRouting.set('inToc', false)
    this.layerRouting.setZIndex(1000)
    this.map.addLayer(this.layerRouting)

  }

  setPositionOfMarker(type) {

    if (type == "depart") {
      var color = "rgb(0, 158, 255)"
    } else {
      var color = "rgb(255, 107, 0)"
    }
    if (this.drawRouting) {
      this.map.removeInteraction(this.drawRouting);
    }



      this.drawRouting = new Draw({
        source: this.sourceRouting,
        type: 'Point',
        style: new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({
              color: color
            })
          })
        })
      });

      this.map.addInteraction(this.drawRouting);



    // this.translate.get('notifications', { value: 'partager' }).subscribe((res: any) => {
      // var notif = this.notif.open(res.click_on_map_itineraire, 'Fermer', {
      //   duration: 20000
      // });

      this.drawRouting.on("drawend", (e) => {
        // notif.dismiss()

        this._ngZone.run(() => {

          var coord = e.feature.getGeometry().getCoordinates();
          var coord_4326 = Transform(coord, 'EPSG:3857', 'EPSG:4326')

          var feat_to_remove;

          for (let index = 0; index < this.layerRouting.getSource().getFeatures().length; index++) {
            const my_feat = this.layerRouting.getSource().getFeatures()[index];
            if (my_feat.get('data') == type) {
              feat_to_remove = my_feat
            }
          }

          if (feat_to_remove) {
            this.layerRouting.getSource().removeFeature(feat_to_remove)
          }
          e.feature.set('data',type)
          this.data_itineraire[type]['coord'] = coord_4326
          this.data_itineraire[type]['set'] = true

          var geocodeOsm = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + coord_4326[1] + "&lon=" + coord_4326[0] + "&zoom=18&addressdetails=1"

          $.get(geocodeOsm, (data) => {
            var name = data.display_name.split(',')[0]
            this.data_itineraire[type]['nom'] = name
          })

          this.calculate_itineraire()
          this.map.removeInteraction(this.drawRouting);
        })
      });

    // });

  }

  calculate_itineraire() {
    if (this.data_itineraire.depart.coord.length == 2 && this.data_itineraire.destination.coord.length == 2) {
      var a = this.data_itineraire.depart.coord
      var b = this.data_itineraire.destination.coord
      this.data_itineraire.route.loading = true
      this.data_itineraire.route.set = false
      var url = "http://router.project-osrm.org/route/v1/driving/" + a[0] + "," + a[1] + ";" + b[0] + "," + b[1] + "?overview=full"
      $.get(url, (data) => {
        // console.log(data)
        this.data_itineraire.route.loading = false

        if (data['routes'] && data['routes'].length > 0) {
          this.data_itineraire.route.data = data
          this.display_itineraire(data)
        }
      })

    }
  }

  display_itineraire(data) {
    var route = new Polyline({
      factor: 1e5
    }).readGeometry(data.routes[0].geometry, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    var newMarker = new Feature({
      data: 'route',
      geometry: route

    });

    var feat_to_remove;
    for (let index = 0; index < this.layerRouting.getSource().getFeatures().length; index++) {
      const my_feat = this.layerRouting.getSource().getFeatures()[index];
      if (my_feat.get('data') == 'route') {
        feat_to_remove = my_feat
      }
    }

    if (feat_to_remove) {
      this.layerRouting.getSource().removeFeature(feat_to_remove)
    }
    this.data_itineraire.route.set = true
    this.layerRouting.getSource().addFeature(newMarker)

  }

  formatTimeInineraire(timesSecondes: number): string {
    // var startTime = moment(document.getElementById("startTime").value, "HH:mm");
    // var endTime = moment(document.getElementById("end").value, "HH:mm");

    var duration = moment.duration(timesSecondes, 'seconds');
    var hours = '0' + duration.hours();
    var minutes = '0' + duration.minutes();
    // console.log(hours.slice(-2),minutes.slice(-2))
    // document.getElementById('dateDiffResult').value = hours +":"+ minutes;
    return hours.slice(-2) + ":" + minutes.slice(-2)
  }

  formatDistance(distanceMeters: number): string {
    var distanceKm = distanceMeters / 1000
    return distanceKm.toFixed(2)
  }

  clear_itineraire() {

    this.layerRouting.getSource().clear()
    this.data_itineraire.route.set = false
    this.data_itineraire.depart.coord = []
    this.data_itineraire.depart.nom = ""
    this.data_itineraire.destination.coord = []
    this.data_itineraire.destination.nom = ""

  }

}
