import { Component, OnInit, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageServiceService } from '../../../services/storage-service/storage-service.service'
import {
  Map, Zoom, TileLayer, XYZ, View, defaultControls,
} from '../../../ol-module';
/**
 * first composant of the left sidenav
 */
@Component({
  selector: 'app-sidenave-left-principal',
  templateUrl: './sidenave-left-principal.component.html',
  styleUrls: ['./sidenave-left-principal.component.scss']
})
export class SidenaveLeftPrincipalComponent implements OnInit {

  environment

  /**
   * Map of the app
   */
  @Input() map: Map

  constructor(
    protected StorageServiceService: StorageServiceService
  ) {
    this.environment = environment
  }

  ngOnInit(): void {
    this.loadPrincipalMapLayer()
  }

  /**
   * Load principal map: the base map of the project
   */
  loadPrincipalMapLayer() {
    var ghostMap = new Map({
      target:"ghostMap",
      layers: [

      ],
      view: this.map.getView()
    });
    var osmLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      })
    })

    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {

        let donnePrinciaplMap= this.StorageServiceService.getPrincipalCarte()

        if (donnePrinciaplMap) {
          let groupCarte = donnePrinciaplMap.groupCarte
          let carte = donnePrinciaplMap.carte
          ghostMap.addLayer(osmLayer)
          console.log(groupCarte,carte)
        }else{
          ghostMap.addLayer(osmLayer)
        }
      }
    })
  }


}
