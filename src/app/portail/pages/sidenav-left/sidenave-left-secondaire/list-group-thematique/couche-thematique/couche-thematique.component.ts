import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { coucheInterface, Layer } from '../../../../../../type/type';
import { environment } from '../../../../../../../environments/environment';
import { CartoHelper } from '../../../../../../../helper/carto.helper';
import {
  Map,
} from "../../../../../../giro-3d-module"
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
   * layer to displqy
   */
  @Input() layer: Layer;

  /**
  */
  @Input() map: Map;

  /**
   * Activat/desactivate couche
   */
  @Output() toogle = new EventEmitter();

  environment = environment

  constructor(
  ) { }

  ngOnInit(): void {
  }

  isLayerInMap(layer: Layer) {

    return new CartoHelper(this.map).getLayerByPropertiesCatalogueGeosm({
      couche_id: layer.layer_id,
      type: 'couche'
    }).length > 0
  }

  /**
   * Is this layer entire defined in the adminstrative panel ?
   * If it is not, we can not add it to the map
   * @param layer Layer
   */
  shouldDisabled(layer: Layer): boolean {
    if ((layer.providers.length == 0 || layer.providers?.filter((provider) => provider.vp.state == 'good').length == 0)) {
      return true
    } else {
      return false
    }
  }


}
