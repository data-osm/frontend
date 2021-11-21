import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { Observable, fromEvent, merge as observerMerge, ReplaySubject } from 'rxjs';
import { debounceTime, map, takeUntil, tap } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import * as $ from 'jquery'
import { Map } from 'ol';
import { CartoHelper, layersInMap } from '../../../../../helper/carto.helper';
import { DataOsmLayersServiceService } from '../../../../services/data-som-layers-service/data-som-layers-service.service';
import { fromOpenLayerEvent } from '../../../../shared/class/fromOpenLayerEvent';
import { ObjectEvent } from 'ol/Object';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
/**
 * handle legend of layers in the TOC
 */
export class LegendComponent implements OnInit {

  @Input() map: Map

  layersInTocWithLegend: Array<layersInMap> = []
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  constructor(
    public DomSanitizer: DomSanitizer,
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(){
    this.destroyed$.next()
    this.destroyed$.complete()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.map) {
      if (this.map) {

        fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(), 'propertychange').pipe(
          takeUntil(this.destroyed$),
          tap(() => {
            this.layersInTocWithLegend = new CartoHelper(this.map).getAllLayersInToc()
              .filter((layerProp) => layerProp.type_layer == 'geosmCatalogue' && layerProp.properties['type'] == 'couche')
              .filter((value, index, self)=>{
                /**
                 * unique layer ^^
                 */
                 return self.map((item)=>item.properties['couche_id']+item.properties['type']).indexOf(value.properties['couche_id']+value.properties['type']) === index;

              })
              .map((layerProp) => {
                let layer = this.dataOsmLayersServiceService.getLayerInMap(layerProp.properties['couche_id']).layer
                layerProp.legendCapabilities = []
                layer.providers
                  .filter((provider) => { return provider.vp.state == 'good' && provider.vp.id_server != undefined })
                  .map((provider) => {
                    
                    
                    layerProp.legendCapabilities.push(
                      {
                        description:provider.vs.description,
                        urlImg: $.trim(environment.url_carto+provider.vp.url_server + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=" + provider.vp.id_server + "&STYLE=" + provider.vs.name + "&SLD_VERSION=1.1.0&LAYERTITLE=false&RULELABEL=true")
                      }
                    )

                  })


                return layerProp

              })

              function compare(a, b) {
                if (a.zIndex < b.zIndex) {
                  return 1;
                }
                if (a.zIndex > b.zIndex) {
                  return -1;
                }
                return 0;
              }
              this.layersInTocWithLegend.sort(compare);
          })
        ).subscribe()

      }
    }

  }

}
