import { Component, OnInit, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { StorageServiceService } from '../../../services/storage-service/storage-service.service'
import {
  Map
} from '../../../ol-module';
import { groupCarteInterface, carteInterface, groupThematiqueInterface, groupInterface } from '../../../../app/type/type';
import * as $ from 'jquery'
import { cartoHelper } from '../../../../helper/carto.helper'
import { manageCompHelper } from '../../../../helper/manage-comp.helper'

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

  ghostMap

  /**
   * Map of the app
   */
  @Input() map: Map

  /**
   * Data of the main map to display in the app
   */
  donnePrincipalMap: {
    groupCarte: groupCarteInterface;
    carte: carteInterface;
  } | null

  constructor(
    public StorageServiceService: StorageServiceService,
    public manageCompHelper:manageCompHelper
  ) {
    this.environment = environment
  }

  ngOnInit(): void {
    this.loadPrincipalMapLayer()
  }

  /**
  * Add layer shadow in the map
  */
  addLayerShadow() {
    var cartoHelperClass = new cartoHelper()
    var layer = cartoHelperClass.constructShadowLayer(this.StorageServiceService.getConfigProjet().roiGeojson)
    layer.setZIndex(1000)
    this.map.addLayer(layer)
    // var groupLayerShadow = cartoHelperClass.getLayerGroupByNom('group-layer-shadow')
    // groupLayerShadow.setZIndex(1000)
    // groupLayerShadow.getLayers().getArray().unshift(layer)

  }

  /**
   * Load principal map: the base map of the project
   */
  loadPrincipalMapLayer() {
    this.ghostMap = new Map({
      target: "ghostMap",
      layers: [

      ],
      view: this.map.getView()
    });

    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.addLayerShadow()
        this.tooglePrincipalMapLayer()

      }
    })
  }

  /**
   * Add or remove principal map to layer
   */
  tooglePrincipalMapLayer() {

    this.donnePrincipalMap = this.StorageServiceService.getPrincipalCarte()
    if (this.donnePrincipalMap) {
      if (this.donnePrincipalMap.carte.check) {
        this.removePrincipalMapLayer()
      } else {
        this.addPrincipalMapLayer()
      }
    }
  }

  addPrincipalMapLayer() {
    var cartoHelperClassMap = new cartoHelper()
    this.donnePrincipalMap = this.StorageServiceService.getPrincipalCarte()

    if (this.donnePrincipalMap) {
      let groupCarte = this.donnePrincipalMap.groupCarte
      let carte = this.donnePrincipalMap.carte
      this.donnePrincipalMap.carte.check = true
      var type;
      if (carte.type == 'WMS') {
        type = 'wms'
      } else if (carte.type == 'xyz') {
        type = 'xyz'
      }
      var layer = cartoHelperClassMap.constructLayer(
        {
          nom: carte.nom,
          type: type,
          type_layer: 'geosmCatalogue',
          url: carte.url,
          visible: true,
          inToc:true,
          properties: {
            group_id: groupCarte.id_cartes,
            couche_id: carte.key_couche,
            type: 'carte',
          },
          tocCapabilities:{
            share:false,
            metadata:true,
            opacity:true
          },
          iconImagette: environment.url_prefix + '/' + carte.image_src,
          descriptionSheetCapabilities:undefined
        }
      )

      var layerGhost = new cartoHelper(this.ghostMap).constructLayer(
        {
          nom: carte.nom,
          type: type,
          type_layer: 'geosmCatalogue',
          url: carte.url,
          visible: true,
          inToc:true,
          properties: {
            group_id: groupCarte.id_cartes,
            couche_id: carte.key_couche,
            type: 'carte'
          },
          tocCapabilities:{
            share:false,
            metadata:true,
            opacity:true
          },
          descriptionSheetCapabilities:undefined
        }
      )

      this.ghostMap.addLayer(layerGhost)
      cartoHelperClassMap.addLayerToMap(layer)

    } else {
      // var layer =  cartoHelperClassMap.constructLayer(
      //   {
      //     nom:"OSM MAPNIK",
      //     type:'xyz',
      //     type_layer:'other',
      //     url:'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      //     visible:true,
      //     properties:null
      //   }
      // )

      // var layerGhost =  new cartoHelper(this.ghostMap).constructLayer(
      //   {
      //     nom:"OSM MAPNIK",
      //     type:'xyz',
      //     type_layer:'other',
      //     url:'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      //     visible:true,
      //     properties:null
      //   }
      // )

      // this.ghostMap.addLayer(layerGhost)
      // cartoHelperClassMap.addLayerToMap(layer)
    }
  }

  removePrincipalMapLayer() {
    this.donnePrincipalMap = this.StorageServiceService.getPrincipalCarte()
    var cartoHelperClassMap = new cartoHelper(this.map)
    this.donnePrincipalMap.carte.check = false
    var layer = cartoHelperClassMap.getLayerByPropertiesCatalogueGeosm({
      group_id: this.donnePrincipalMap.groupCarte.id_cartes,
      couche_id: this.donnePrincipalMap.carte.key_couche,
      type: 'carte'
    })
    for (let index = 0; index < layer.length; index++) {
      cartoHelperClassMap.removeLayerToMap(layer[index])
    }

  }
  /**
   * Open group thematique slide
   * @param groupThematique groupThematiqueInterface
   */
  openGroupThematiqueSlide(groupThematique: groupThematiqueInterface) {
    this.manageCompHelper.openGroupThematiqueSlide(groupThematique)
  }

  /**
   * Open group carte slide
   * @param groupCarte groupCarteInterface
   */
  openGroupCarteSlide(groupCarte: groupCarteInterface) {
    this.manageCompHelper.openGroupCarteSlide(groupCarte)
  }

  /**
   * display label for the bibliotheque arborescence ?
   * if we have more than one group cates or if the only group carte is not the principal one
   */
  displayLabelForBibliothequeArborescence(){
    if (this.StorageServiceService.getAllGroupCarte().length > 1) {
      return true
    }else if(this.StorageServiceService.getAllGroupCarte().length == 1 && this.StorageServiceService.getAllGroupCarte()[0].id_cartes != this.donnePrincipalMap.groupCarte.id_cartes ) {
      return true
    }else{
      return false
    }
  }

}
