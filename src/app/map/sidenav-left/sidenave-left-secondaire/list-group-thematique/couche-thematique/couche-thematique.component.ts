import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from 'src/environments/environment';
import { coucheInterface } from 'src/app/type/type';
import {GeosmLayersServiceService} from 'src/app/services/geosm-layers-service/geosm-layers-service.service'
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
    public GeosmLayersServiceService:GeosmLayersServiceService
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
      this.GeosmLayersServiceService.addLayerCouche(couche)
    }else{
      this.GeosmLayersServiceService.removeLayerCouche(couche)
    }
  }

}
