import { Component, OnInit, ViewChild, ElementRef, Renderer2, EventEmitter, Input } from '@angular/core';
import { coucheInterface, carteInterface, configProjetInterface } from '../../../../type/type';
import { FormGroup, FormArray, FormBuilder, FormControl, AbstractControl, Validators } from '@angular/forms';
import { BackendApiService } from '../../../../services/backend-api/backend-api.service'
import { startWith, map, filter, debounceTime, tap } from 'rxjs/operators';
import { EMPTY, from, Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { selectLayersForDownload, downloadModelInterface, ParametersGeometryDB } from './download-select-layers'
import { GeoJSON, VectorLayer, VectorSource, Style, Stroke, Fill, Feature, Overlay, getCenter, Map, OverlayPositioning } from '../../../../ol-module';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { environment } from '../../../../../environments/environment';
import { CartoHelper } from '../../../../../helper/carto.helper'
import { manageDataHelper } from '../../../../../helper/manage-data.helper'
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import { ChartOverlayComponent } from './chart-overlay/chart-overlay.component'
import * as $ from 'jquery'
import {ListDownloadLayersComponent,downloadDataModelInterface} from './list-download-layers/list-download-layers.component'
import { ResponseOfSerachLimitInterface } from '../../../../type/type';
import * as moment from 'moment';



@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
/**
 * Components for dowloads data purposes
 */
export class DownloadComponent extends selectLayersForDownload implements OnInit {

  @Input()map:Map

  @ViewChild('downlod_list_overlays') downlodListOverlays: ElementRef;
  lastSaturday = moment().subtract(1, 'weeks').isoWeekday(6).locale("fr");
  /**
   * Event emitter listen when a overlay is closed
   */
  userClosedOverlay: EventEmitter<any> = new EventEmitter<any>()

  /**
   * Event emitter listen when a use want to list all files to download them
   */
  userListFilesToDownload: EventEmitter<any> = new EventEmitter<any>()

  /**
   * Configuration of the project
   */
  configProejct: configProjetInterface

  /**
   * List of charts in the map
   */
  listOfChartsInMap: {
    [key: string]: {
      index: number
      nom: string
      nom_file: string
      number: number,
      id:number
    }[]
  } = {}

  /**
   * forms use to choose emprise to make the download
   */
  formsEmprise: FormGroup;

  filterEmpriseOptions: ResponseOfSerachLimitInterface[] = []

  constructor(
    private renderer: Renderer2,
    public BackendApiService: BackendApiService,
    public fb: FormBuilder,
    public manageCompHelper: ManageCompHelper
  ) {
    super(fb)
  }

  ngOnInit(): void {
    // this.StorageServiceService.states.subscribe((value) => {
    //   if (value.loadProjectData) {
    //     this.configProejct = this.StorageServiceService.getConfigProjet()
    //     this.layersDownlodable = this.getAllLayersDownlodable()
    //     this.initialiseFormsLayers(true, this.map)

    //     if (this.configProejct.limites.length > 0) {
    //       this.downloadModel.roiType = 'emprise'
    //       this.initialiseFormsEmprise()
    //     } else {
    //       this.setRoiTypeToAll()
    //     }

    //     this.userClosedOverlay.subscribe((idOverlay) => {
    //       this.closeChart(idOverlay)
    //     })

    //     this.userListFilesToDownload.subscribe((idOverlay) => {
    //       this.openModalListDonwnloadLayers(idOverlay)
    //     })

    //     if (this.formsEmprise.get('emprise')) {
    //       this.StorageServiceService.adminstrativeLimitLoad.pipe().subscribe(
    //         (limit:ResponseOfSerachLimitInterface)=>{
    //           if (limit ) {
    //             this.formsEmprise.get('emprise').setValue(limit)
    //             this.setParametersGeometryBd({
    //               table: limit.table,
    //               id: limit.id,
    //               name: limit.name
    //             })
    //             if (limit.geometry) {
    //               this.downloadModel.roiGeometry = limit.geometry
    //             }else{
    //               this.getGeometryOfEmprise({ table: limit.table, id: limit.id })
    //             }
    //           }
    //         }
    //       )
    //     }

    //   }
    // })

    
  }

  /**
   * construct layer that will help to display result from export
   */
  constructLayerToDisplayResult() {
    this.removeLayerExportData()

    var layerExport = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({
          color: "#000",
          width: 2,
        }),
        fill: new Fill({
          color: environment.primaryColor,
        }),
      }),
      updateWhileAnimating: true,
    })
    layerExport.set('tocCapabilities',{
      opacity: false,
      metadata: false,
      share: false
    })
    layerExport.set('nom', 'exportData')
    layerExport.set('type_layer', 'exportData')
    layerExport.set('iconImagette', environment.url_frontend + '/assets/icones/draw.svg')
    layerExport.set('inToc', false)
    layerExport.setZIndex(1000)

    return layerExport

  }
  /**
   * initialise forms use to select emprise to perform download
   */
  initialiseFormsEmprise() {
    var empriseControl = new FormControl('', [Validators.minLength(2)])

    empriseControl.valueChanges.pipe(
      debounceTime(300),
      filter(value => typeof value == 'string' && value.length > 1),
      startWith(''),
      tap(() => { console.log('loading') }),
      map((value) => {
        return EMPTY
        // return from(this.BackendApiService.post_requete('/searchLimite', { 'word': value.toString() }))
      })
    ).subscribe((value: Observable<any>) => {

      value.subscribe((data) => {
        var response: Array<ResponseOfSerachLimitInterface> = []
        for (const key in data) {
          if (data.hasOwnProperty(key) && key != 'status') {
            const element = data[key];
            for (let index = 0; index < element.length; index++) {
              const responseI = element[index];
              if (this.getLimitName(key)) {
                response.push({
                  ref: responseI['ref'],
                  name: responseI['name'],
                  id: responseI['id'],
                  table: key,
                  limitName: this.getLimitName(key)
                })
              }
            }
          }
        }

        this.filterEmpriseOptions = response

      })
    })

    this.formsEmprise = this.fb.group({
      emprise: empriseControl
    })
  }

  /**
   * Use to format text that will appear after an option is choose in the autocomplete use to select layers in the UI
   * @param emprise searchLayerToDownlodModelInterface
   * @return string
   */
  displayAutocompleEmpriseFn(emprise: ResponseOfSerachLimitInterface): string {
    if (emprise) {
      if (emprise.ref) {
        return emprise.name + '(' + emprise.ref + ')'
      } else {
        return emprise.name
      }
    } else {
      return ''
    }
  }

  /**
   * execute when user select an emprise from autopcomplete
   * @param option MatAutocompleteSelectedEvent
   */
  empriseSelected(option: MatAutocompleteSelectedEvent) {
    var empriseInForm: ResponseOfSerachLimitInterface = option.option.value
    if (empriseInForm.table && empriseInForm.id) {
      this.setParametersGeometryBd({
        table: empriseInForm.table,
        id: empriseInForm.id,
        name: empriseInForm.name
      })
      this.getGeometryOfEmprise({ table: empriseInForm.table, id: empriseInForm.id })
    }
  }

/**
 * set parameters that can help to fetch the geometry of a administrative limit
 * @param parameters ParametersGeometryDB
 */
  setParametersGeometryBd(parameters:ParametersGeometryDB){
    this.downloadModel.parametersGeometryDB = {
      table: parameters.table,
      id: parameters.id,
      name: parameters.name
    }
  }

  /**
   * get ol geometry of an emprise
   * @param params {table:string,id:number}
   */
  getGeometryOfEmprise(params: { table: string, id: number }) {
    // this.BackendApiService.post_requete('/getLimitById', params).then(
    //   (response) => {
    //     var geojson = JSON.parse(response["geometry"])
    //     var feature = new GeoJSON().readFeature(
    //       geojson,
    //       {
    //         dataProjection: "EPSG:4326",
    //         featureProjection: "EPSG:3857",
    //       }
    //     );
    //     this.downloadModel.roiGeometry = feature.getGeometry()
    //   },
    //   (err) => {

    //   }
    // )
  }

  /**
   * Set type of ROI to 'all'
   */
  setRoiTypeToAll() {
    this.downloadModel.roiType = 'all'
    var feature = new GeoJSON().readFeature(
      this.configProejct.roiGeojson,
      {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }
    );
    this.downloadModel.roiGeometry = feature.getGeometry()
    this.downloadModel.parametersGeometryDB = undefined
    if (this.formsEmprise) {
      this.formsEmprise.reset('')
    }

  }

  toogleRoiType(value: MatSlideToggleChange) {
    if (value.checked) {
      this.setRoiTypeToAll()
    } else {
      this.downloadModel.roiType = 'emprise'
      this.downloadModel.roiGeometry = undefined
    }
  }

  /**
   * Should the btn to dowload enable ?
   * if at least a layer to download is set and aa geometry is set
   */
  enableDownloadBtn(): boolean {
    if (this.downloadModel.layers.length > 0 && this.downloadModel.roiGeometry) {
      return true
    } else {
      return false
    }
  }

  /**
   * get name of a limit by the name of it table
   * @param tableName string name of the table
   * @retun string
   */
  getLimitName(tableName: string): string {
    var response;
    for (let index = 0; index < this.configProejct.limites.length; index++) {
      const element = this.configProejct.limites[index];
      if (element.nom_table == tableName) {
        response = element.nom
      }
    }
    return response
  }

  /**
   * Generate export : if type of ROI is:
   * - 'all' , this will call the function displayResultExport()
   * - 'emprise', this will call the function calculateExportInDB()
   */
  generateExport(){
    if (this.downloadModel.roiType == 'emprise') {
      this.calculateExportInDB()
    }else{
      var layers:Array<{
        index: number
        nom: string
        nom_file: string
        number: number
        id: number
      }>=[]

      for (let index = 0; index < this.downloadModel.layers.length; index++) {
        const layer = this.downloadModel.layers[index];
        // var nom_shp = environment.url_service + '/' + environment.path_qgis + '/' + environment.pojet_nodejs + '/gpkg/' + layer.params_files.nom_cat.replace(/[^a-zA-Z0-9]/g, '_') + '_' + layer.params_files.sous_thematiques + '_' + layer.params_files.key_couche + '_' + layer.params_files.id_cat + '.gpkg'
        layers.push({
          'index': index,
          'nom': layer.nom,
          'number': layer.number,
          'nom_file': 'nom_shp',
          'id': layer.key_couche,
        })
      }

      this.displayResultExport(layers,this.downloadModel.roiGeometry,'Export total')
    }
  }
  /**
   * calculate the export in the DB
   */
  calculateExportInDB() {
    var listLayer = []
    for (let index = 0; index < this.downloadModel.layers.length; index++) {
      const layer = this.downloadModel.layers[index];
      listLayer.push({
        'url': layer.url,
        'methode': 'qgis',
        'index': index,
        'nom': layer.nom,
        'id_cat': layer.params_files.id_cat,
        'type': layer.type_couche,
        'identifiant': layer.identifiant,
        // 'id_them': this.StorageServiceService.getGroupThematiqueFromIdCouche(layer.key_couche).id_thematique,
        'key_couche': layer.key_couche,
      })
    }
    var parameters = {
      'querry': listLayer,
      'lim_adm': this.downloadModel.parametersGeometryDB.table,
      'id_lim': this.downloadModel.parametersGeometryDB.id,
    }
    $('.export-data-loading').show()
    // this.BackendApiService.post_requete('/thematique/donwload', parameters).then(
    //   (response: Array<{
    //     index: number
    //     nom: string
    //     nom_file: string
    //     number: number,
    //     id:number
    //   }>) => {
    //     $('.export-data-loading').hide()
    //     for (let i = 0; i < response.length; i++) {
    //       response[i].id = listLayer[response[i].index].key_couche
    //       response[i].nom_file = environment.url_prefix+response[i].nom_file
    //     }

    //     this.displayResultExport(response, this.downloadModel.roiGeometry, this.downloadModel.parametersGeometryDB.name)
    //   },
    //   (error) => {
    //     $('.export-data-loading').hide()
    //   }
    // )
  }

  /**
   * display result of export data
   * @param listData Array<>
   */
  displayResultExport(listData: Array<
    {
      index: number
      id: number
      nom: string
      nom_file: string
      number: number
    }>, geometry: any, title: string) {

    this.closeAllChartsInMap()

    var idOverlay = manageDataHelper.makeid()

    /** construct add layer of ROI to the map */
    var layerExport = this.constructLayerToDisplayResult()
    layerExport.set('properties', { 'idOverlay': idOverlay })
    var featureRoi = new Feature()
    featureRoi.setGeometry(geometry)
    layerExport.getSource().addFeature(featureRoi)

    var cartoClass = new CartoHelper(this.map)
    cartoClass.addLayerToMap(layerExport)


    cartoClass.map.getView().fit(layerExport.getSource().getExtent(), { size: cartoClass.map.getSize(), duration: 1000 })

    /** construct and add overlay with the diagram on the map */
    var centerOfRoi = getCenter(layerExport.getSource().getExtent());



    /** Construct the chart configuration */
    var numbers = [];
    var labels = [];
    for (var index = 0; index < listData.length; index++) {
      numbers.push(listData[index]["number"]);
      labels.push(listData[index]["nom"] + " (" + listData[index]["number"] + ") ");
    }
    var dynamicColors = function () {
      var r = Math.floor(Math.random() * 255);
      var g = Math.floor(Math.random() * 255);
      var b = Math.floor(Math.random() * 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    };
    var coloR = [];
    for (var i in numbers) {
      coloR.push(dynamicColors());
    }

    let chartConfig =
    {
      type: "pie",
      scaleFontColor: "red",
      data: {
        labels: labels,
        datasets: [
          {
            data: numbers,
            backgroundColor: coloR,
            borderColor: "rgba(200, 200, 200, 0.75)",
            hoverBorderColor: "rgba(200, 200, 200, 1)",
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: title,
          fontColor: "#fff",
          fontSize: 16,
          position: "top",
        },
        legend: {
          display: true,
          labels: {
            fontColor: "#fff",
            fontSize: 14,
          },
        },
        scales: {
          xAxes: [
            {
              display: false,
              ticks: {
                fontColor: "Black",
              },
            },
          ],
          yAxes: [
            {
              display: false,
            },
          ],
        },

        onClick: (event) => {
          console.log(event);
          var name_analyse = event.target.id;
        }
      }

    }

    var elementChart = this.manageCompHelper.createComponent(ChartOverlayComponent, { 'chartConnfiguration': chartConfig, 'idChart': idOverlay, 'close': this.userClosedOverlay,'listFiles': this.userListFilesToDownload })

    this.manageCompHelper.appendComponent(elementChart, this.downlodListOverlays.nativeElement)

    var overlayExport = new Overlay({
      position: centerOfRoi,
      positioning: OverlayPositioning.CENTER_CENTER,
      element: elementChart.location.nativeElement,
      id: idOverlay
    });

    cartoClass.map.addOverlay(overlayExport);

    this.listOfChartsInMap[idOverlay] = listData

  }

  /**
   * Close a chart : remove layer and overlay to the map
   * @param idOverlay string
   */
  closeChart(idOverlay:string) {
    var cartoClass = new CartoHelper(this.map)

    this.removeLayerExportData()

    var overlay = cartoClass.map.getOverlayById(idOverlay)
    cartoClass.map.removeOverlay(overlay)
  }

  /**
   * Open modal to list all files that can be download
   * @param idOverlay string
   */
  openModalListDonwnloadLayers(idOverlay:string){
    var modelDownload:downloadDataModelInterface[] = []
    for (let index = 0; index < this.listOfChartsInMap[idOverlay].length; index++) {
      const element = this.listOfChartsInMap[idOverlay][index];
      modelDownload.push({
        layer:undefined,
        groupThematique:undefined,
        empriseName:this.downloadModel.parametersGeometryDB?this.downloadModel.parametersGeometryDB.name:'Export total',
        nom:element.nom,
        number:element.number,
        index:element.index,
        id:element.id,
        url:element.nom_file
      })
    }

    this.manageCompHelper.openModalDownloadData(modelDownload,[],()=>{

    })

  }

  /**
   * Close all charts in the map
   */
  closeAllChartsInMap(){
    for (const key in this.listOfChartsInMap) {
      if (this.listOfChartsInMap.hasOwnProperty(key)) {
        this.closeChart(key)
      }
    }
  }

  /**
   * Remove layer exportData from map if exist
   */
  removeLayerExportData() {
    var cartoClass = new CartoHelper(this.map)
    var layer = cartoClass.getLayerByName('exportData')
    for (let index = 0; index < layer.length; index++) {
      const element = layer[index];
      cartoClass.map.removeLayer(element)
    }
  }

}
