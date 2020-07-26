import { Component, OnInit, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageServiceService } from '../../../services/storage-service/storage-service.service'
import {
  Map, Zoom, TileLayer, XYZ, View, defaultControls,
} from '../../../ol-module';
import { groupCarteInterface, carteInterface, groupThematiqueInterface, groupInterface } from 'src/app/type/type';
import {SidenaveLeftSecondaireComponent} from '../sidenave-left-secondaire/sidenave-left-secondaire.component'
import * as $ from 'jquery'
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

  /**
   * Secondary component of the left sidenav. On top of the first one:
   * It is use to show details of a group thematique or a group carte
   */
  @Input() SidenaveLeftSecondaireComp: SidenaveLeftSecondaireComponent

  /**
   * Data of the main map to display in the app
   */
  donnePrincipalMap: {
    groupCarte: groupCarteInterface;
    carte: carteInterface;
  } | null

  constructor(
    public StorageServiceService: StorageServiceService
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
      target: "ghostMap",
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

        this.donnePrincipalMap = this.StorageServiceService.getPrincipalCarte()

        if (this.donnePrincipalMap) {
          let groupCarte = this.donnePrincipalMap.groupCarte
          let carte = this.donnePrincipalMap.carte
          ghostMap.addLayer(osmLayer)
          console.log(groupCarte, carte)
        } else {
          ghostMap.addLayer(osmLayer)
        }
      }
    })
  }

  /**
   * Open group thematique slide
   * @param groupThematique groupThematiqueInterface
   */
  openGroupThematiqueSlide(groupThematique:groupThematiqueInterface){
    this.SidenaveLeftSecondaireComp.setGroupThematique(groupThematique)
    this.SidenaveLeftSecondaireComp.open()
  }

  /**
   * Open group carte slide
   * @param groupCarte groupCarteInterface
   */
  openGroupCarteSlide(groupCarte:groupCarteInterface){
    this.SidenaveLeftSecondaireComp.setGroupCarte(groupCarte)
    this.SidenaveLeftSecondaireComp.open()
  }

}
