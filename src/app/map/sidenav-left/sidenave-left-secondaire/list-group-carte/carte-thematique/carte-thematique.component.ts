import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from 'src/environments/environment';
import { carteInterface } from 'src/app/type/type';
import {GeosmLayersServiceService} from 'src/app/services/geosm-layers-service/geosm-layers-service.service'

@Component({
  selector: 'app-carte-thematique',
  templateUrl: './carte-thematique.component.html',
  styleUrls: ['./carte-thematique.component.scss']
})
/**
 * Display a carte of a group carte
 */
export class CarteThematiqueComponent implements OnInit {

  /**
  * Carte to displqy
  */
  @Input() carte: carteInterface;

  /**
   * Activat/desactivate carte
   */
  @Output() toogle_carte = new EventEmitter();

  url_prefix = environment.url_prefix

  constructor(
    public GeosmLayersServiceService:GeosmLayersServiceService
  ) { }

  ngOnInit(): void {
  }

  /**
  * Toogle layer
  * @param couche carteInterface
  */
  toogleLayer(couche: carteInterface) {
    if (couche.check) {
      this.GeosmLayersServiceService.addLayerCarte(couche)
    } else {
      this.GeosmLayersServiceService.removeLayerCarte(couche)
    }
  }

}
