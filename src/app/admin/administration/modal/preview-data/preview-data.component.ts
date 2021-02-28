import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { from } from 'rxjs';
import { DataForPreview } from '../../../../type/type';
import {
Map, TileLayer, TileWMS, RasterSource, VectorSource, VectorLayer,OSM, View, ImageWMS, ImageLayer, LayerGroup, transformExtent
}from '../../../../ol-module'
import { MatRadioChange } from '@angular/material/radio';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-preview-data',
  templateUrl: './preview-data.component.html',
  styleUrls: ['./preview-data.component.scss']
})
/**
 * Preview gepgraphic data from a cartographic server
 */
export class PreviewDataComponent implements OnInit {

  private readonly notifier: NotifierService;
  map
  constructor(
    public dialogRef: MatDialogRef<PreviewDataComponent>,
    notifierService: NotifierService,
    @Inject(MAT_DIALOG_DATA) public layersForPreview: DataForPreview[]
  ) { 
    this.notifier = notifierService;

    this.map = new Map({
      layers: [
        new TileLayer({
          source: new OSM(),
        }) ],
      target: 'map',
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    
    this.layersForPreview
    .filter((data)=> data.url_server && data.id_server && data.style.length>0)
    .map(
      (data:DataForPreview)=>{

        let layerTile = new TileLayer({
          source: new TileWMS({
            url: environment.url_carto+data.url_server,
            params: { 'LAYERS': data.id_server, 'TILED': true,'STYLE':data.style[0] },
            serverType: 'qgis',
            crossOrigin: 'anonymous',
          }),
          /**
         * so that map.forEachLayerAtPixel work as expected
         * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
         */
          className: data.name ,
          name: data.name,
          minResolution: this.map.getView().getResolutionForZoom(9)
        });

        let layerImage = new ImageLayer({
          source: new ImageWMS({
            url: environment.url_carto+data.url_server,
            params: { 'LAYERS': data.id_server, 'TILED': true,'STYLE':data.style[0] },
            serverType: 'qgis',
            crossOrigin: 'anonymous',
          }),
          /**
         * so that map.forEachLayerAtPixel work as expected
         * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
         */
          className: data.name,
          name: data.name,
          maxResolution: this.map.getView().getResolutionForZoom(9),
        });

        this.map.addLayer(
          new LayerGroup({
            layers: [
              layerTile,
              layerImage
            ]
          })
        )

        if (data.extent) {
          
          this.map.getView().fit(transformExtent(data.extent,'EPSG:4326','EPSG:3857'), {
            'size': this.map.getSize(),
            'padding': [0, 0, 0, 0],
            'duration': 500
          })
        }
        
      }
    )

  }

  ngOnInit(): void {
    this.map.setTarget('mapf')
    this.map.setTarget('map')
  }

  close(): void {
    this.dialogRef.close(false);
  }

  /**
   * change style of a layer
   * @param changeStyle MatRadioChange
   * @param changeStyle MatRadioChange
   */
  ChangeStyle(changeStyle:MatRadioChange, data:DataForPreview){
    
    this.map.getLayers().getArray()
    .filter((layer)=> layer instanceof LayerGroup == false)
    .filter((layer)=> layer.get('name') == data.name)
    .map((layer)=>{
      console.log(layer,changeStyle.value)
      layer.getSource().updateParams({ 'LAYERS': data.id_server, 'TILED': true,'STYLE':changeStyle.value })
    })

    this.map.getLayers().getArray()
    .filter((layer)=> layer instanceof LayerGroup)
    .map((layers)=>{
      layers.getLayers().getArray()
        .filter((layer)=> layer.get('name') == data.name)
        .map((layer)=>{
            layer.getSource().updateParams({ 'LAYERS': data.id_server, 'TILED': true,'STYLE':changeStyle.value })
        })
    })

  }

}
