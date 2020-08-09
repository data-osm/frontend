import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from 'src/environments/environment';
import { carteInterface } from 'src/app/type/type';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { cartoHelper } from 'src/helper/carto.helper';

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
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
  }

  /**
  * Toogle layer
  * @param couche carteInterface
  */
  toogleLayer(couche: carteInterface) {
    if (couche.check) {
      this.addLayer(couche)
    } else {
      this.removeLayer(couche)
    }
  }


  /**
   * Remove layer in map
   * @param carte coucheInterface
   */
  removeLayer(carte:carteInterface){
    var groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(carte.key_couche)

    let cartoHelperClass = new cartoHelper()

    var layer = cartoHelperClass.getLayerByPropertiesCatalogueGeosm({
      group_id:groupCarte.id_cartes,
      couche_id:carte.key_couche,
      type:'carte'
    })

    for (let index = 0; index < layer.length; index++) {
      cartoHelperClass.removeLayerToMap(layer[index])
      carte.check = false
    }

  }

  /**
   * Add layer to map
   * @param carte carteInterface
   */
  addLayer(carte:carteInterface){
    var groupCarte = this.StorageServiceService.getGroupCarteFromIdCarte(carte.key_couche)

    let cartoHelperClass = new cartoHelper()
    var type;
    if (carte.type == 'WMS') {
      type = 'wms'
    } else if (carte.type == 'xyz') {
      type = 'xyz'
    }

    var layer = cartoHelperClass.constructLayer(
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
        iconImagette: environment.url_prefix + '/' + carte.image_src
      }
    )

    cartoHelperClass.addLayerToMap(layer)
    carte.check = true

  }

}
