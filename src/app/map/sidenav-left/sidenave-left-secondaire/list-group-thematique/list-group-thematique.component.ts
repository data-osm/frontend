import { Component, OnInit, Input } from '@angular/core';
import { MatSelectionListChange } from '@angular/material/list';
import { groupThematiqueInterface } from 'src/app/type/type';
import { coucheInterface } from '../../../../type/type';
import {GeosmLayersServiceService} from 'src/app/services/geosm-layers-service/geosm-layers-service.service'

@Component({
  selector: 'app-list-group-thematique',
  templateUrl: './list-group-thematique.component.html',
  styleUrls: ['./list-group-thematique.component.scss']
})
/**
 * List contents of a group thematique
 */
export class ListGroupThematiqueComponent implements OnInit {

  /**
   * Group thematique to display
   */
  @Input() groupThematique:groupThematiqueInterface

  constructor(
    public GeosmLayersServiceService :GeosmLayersServiceService
  ) { }

  ngOnInit(): void {
  }


  coucheSelected(event: MatSelectionListChange) {
    let couche:coucheInterface = event.option.value
    couche.check = event.option.selected
    this.toogleLayer(couche)
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
