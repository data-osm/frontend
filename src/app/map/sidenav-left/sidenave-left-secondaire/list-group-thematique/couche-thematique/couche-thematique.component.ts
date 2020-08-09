import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from 'src/environments/environment';
import { coucheInterface } from 'src/app/type/type';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import {cartoHelper} from 'src/helper/carto.helper'
import * as $ from 'jquery'
@Component({
  selector: 'app-couche-thematique',
  templateUrl: './couche-thematique.component.html',
  styleUrls: ['./couche-thematique.component.scss']
})
/**
 * Display a couche of a group thematique
 */
export class CoucheThematiqueComponent implements OnInit {

  /**
   * Couche to displqy
   */
  @Input() couche:coucheInterface;

  /**
   * Activat/desactivate couche
   */
  @Output() toogle_couche = new EventEmitter();

  url_prefix = environment.url_prefix

  constructor(
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Is this couche entire defined in the adminstrative panel ?
   * If it is not, we can not add it to the map
   * @param couche coucheInterface
   */
  disabled_couche(couche:coucheInterface):boolean{
    if (couche['wms_type'] == 'osm' && (couche['number'] == 0 || couche['number'] == null)) {
      return true
    }else{
      return false
    }
  }

  /**
   * Toogle layer
   * @param couche coucheInterface
   */
  toogleLayer(couche:coucheInterface){
    if (couche.check) {
      this.addLayer(couche)
    }else{
      this.removeLayer(couche)
    }
  }

  /**
   * Remove layer in map
   * @param couche coucheInterface
   */
  removeLayer(couche:coucheInterface){
    var groupThematique = this.StorageServiceService.getGroupThematiqueFromIdCouche(couche.key_couche)

    let cartoHelperClass = new cartoHelper()

    var layer = cartoHelperClass.getLayerByPropertiesCatalogueGeosm({
      group_id:groupThematique.id_thematique,
      couche_id:couche.key_couche,
      type:'couche'
    })

    for (let index = 0; index < layer.length; index++) {
      cartoHelperClass.removeLayerToMap(layer[index])
      couche.check = false
    }

  }

    /**
   * Recuperer les dimensions d'une image a partir de son lien
   * @param urlImage string url of the image
   * @return (dimenions:{width:number,height:number}) => void
   */
  geDimensionsOfImage(urlImage:string,callBack:(dimenions:{width:number,height:number}) => void){
    try {
      var img = new Image();
    img.onload = function(){
      callBack({width:img.width,height:img.height});
    };
    img.src = urlImage;
    } catch (error) {
      callBack(null)
    }

  }

  /**
   * Add layer to map
   * @param couche coucheInterface
   */

  addLayer(couche:coucheInterface){
    let cartoHelperClass = new cartoHelper()
    var groupThematique = this.StorageServiceService.getGroupThematiqueFromIdCouche(couche.key_couche)
    this.geDimensionsOfImage(environment.url_prefix+'/'+couche.img,(dimension:{width:number,height:number})=>{

      let size = 0.4

      if (dimension) {
        size = 40/dimension.width
      }

      var layer = cartoHelperClass.constructLayer({
        nom:couche.nom,
        type:couche.service_wms == false ?'wfs':couche.type_couche,
        identifiant:couche.identifiant,
        type_layer:'geosmCatalogue',
        url:couche.url,
        visible:true,
        inToc:true,
        properties:{
          group_id:groupThematique.id_thematique,
          couche_id:couche.key_couche,
          type:'couche'
        },
        iconImagette:environment.url_prefix+'/'+couche.logo_src,
        icon:environment.url_prefix+'/'+couche.img,
        cluster:true,
        size:size
      })
      cartoHelperClass.addLayerToMap(layer)
      couche.check = true

    })



  }

}
