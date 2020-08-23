import { Component, OnInit } from '@angular/core';
import { coucheInterface, carteInterface } from '../../../type/type';
import { FormGroup, FormArray, FormBuilder, FormControl, AbstractControl } from '@angular/forms';
import { StorageServiceService } from '../../../services/storage-service/storage-service.service'
import { startWith, map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
/**
 * Interface of the model that manage download features
 */
export interface downloadModelInterface {
  /**
   * Layers choose for download
   */
  layers: Array<coucheInterface>,
  /**
   * Type of the region of interest it can be :
   * - 'all' : download all data
   * - 'draw': download data in the polygon draw by the user
   * - 'emprise' : from emprise of the configuration project
   */
  roiType: 'all' | 'draw' | 'emprise',
  /**
   * Parameters to get geometry in DB
   */
  parametersGeometryDB?:{
    table:string,
    id:number,
    name:string
  }
  /**
   * OL geometry of the region of interest
   */
  roiGeometry: any
}
/**
 * interface of the model use to search layer to be downloded:
 * Model that will appear in the autocomplete seach bar for download data
 */
export interface searchLayerToDownlodModelInterface {
  name: string
  description: string
  id: number,
  source: 'geosmCatalogue' | 'other'
}

/**
 * For select layers user want to download
 */
export class selectLayersForDownload {

  /**
* model that manage download features
*/
  downloadModel: downloadModelInterface = {
    layers: [],
    roiType: undefined,
    roiGeometry: undefined,
    parametersGeometryDB:undefined
  }
  /**
   * forms use to choose layers in UI
   */
  formsLayers: FormGroup;
  formsLayersArray: FormArray;
  /**
   * list of layers that have been filterd
   * use for autocomplete
   */
  filteredLayersOptions: Array<Observable<searchLayerToDownlodModelInterface[]>> = [];

  /**
   * List of all downlodable layers
   */
  layersDownlodable: Array<searchLayerToDownlodModelInterface> = []

  constructor(
    public StorageServiceService: StorageServiceService,
    public fb: FormBuilder
  ) { }


  /**
   * Initialise formsLayers : forms use to choose layers in UI
   * @param boolean loadTOCLayers should we load all layers of the TOC that have the capabilities to be download ?
   */
  initialiseFormsLayers(loadTOCLayers: boolean = false) {
    this.formsLayers = this.fb.group({
      layers: this.fb.array([this.createInputFormsLayer()])
    })
  }

  /**
   * remove an input from the ui to choose a new layer
   * @param i number index of the input
   */
  removeInputInFormsLayer(i: number) {
    this.formsLayersArray = this.formsLayers.get('layers') as FormArray;
    this.formsLayersArray.removeAt(i)
    this.filteredLayersOptions.splice(i, 1)
    this.loadAllLayersInModel()
  }
  /**
   * add a input in the ui to choose a new layer
   */
  addInputInFormsLayer() {
    this.formsLayersArray = this.formsLayers.get('layers') as FormArray;
    this.formsLayersArray.push(this.createInputFormsLayer());
  }

  /**
   * create a input that will be insert in the ui to choose a new layer
   * @return FormGroup
   */
  createInputFormsLayer(): FormGroup {
    /**
     * We first enable autocomplete on the form control
     */
    var newForm = new FormControl('')
    this.filteredLayersOptions.push(
      newForm.valueChanges
        .pipe(
          filter(value => typeof value == 'string'),
          startWith(''),
          map(value => this._filter(value))
        )
    )
    return this.fb.group({
      layer: newForm
    })
  }

  /**
   * Filter all layers that can be downloded by thier name
   * @param value string value enter by the user to search a layer
   */
  private _filter(value: string): searchLayerToDownlodModelInterface[] {
    const filterValue = value.toLowerCase();
    return this.layersDownlodable.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  /**
   * Use to format text that will appear after an option is choose in the autocomplete use to select layers in the UI
   * @param layer searchLayerToDownlodModelInterface
   * @return string
   */
  displayAutocompleLayerstFn(layer: searchLayerToDownlodModelInterface): string {
    // return layer?layer.name+'('+layer.description+')':''
    return layer ? layer.name : ''
  }

  /**
   * funtion emit when ever a layer is selected by the user in the ui
   * @param option MatAutocompleteSelectedEvent
   */
  layerSelected(option: MatAutocompleteSelectedEvent) {
    // var layersInForm:searchLayerToDownlodModelInterface = option.option.value
    this.loadAllLayersInModel()
  }

  /**
   * Load all selected layers in the mdodel of the components eg this.downloadModel.layers
   */
  loadAllLayersInModel(){
    this.downloadModel.layers = []
    this.formsLayersArray = this.formsLayers.get('layers') as FormArray;
    for (let index = 0; index < this.formsLayersArray.controls.length; index++) {
      const element = this.formsLayersArray.controls[index];
      var layersInForm: searchLayerToDownlodModelInterface = element.get('layer').value
      if (layersInForm.source == 'geosmCatalogue') {
        try {
          this.downloadModel.layers.push(
            this.StorageServiceService.getCouche(this.StorageServiceService.getGroupThematiqueFromIdCouche(layersInForm.id).id_thematique, layersInForm.id)
          )
        } catch (error) {

        }
      }
    }
  }

  getAllControls(): Array<AbstractControl> {
    this.formsLayersArray = this.formsLayers.get('layers') as FormArray;
    return this.formsLayersArray.controls
  }

  /**
   * get all layers in the application that can be download
   * @return Array<searchLayerToDownlodModelInterface>
   */
  getAllLayersDownlodable(): Array<searchLayerToDownlodModelInterface> {
    var response: searchLayerToDownlodModelInterface[] = []

    for (let iThematique = 0; iThematique < this.StorageServiceService.getAllGroupThematiques().length; iThematique++) {
      const groupThematique = this.StorageServiceService.getAllGroupThematiques()[iThematique];

      if (groupThematique.sous_thematiques) {
        for (let index = 0; index < groupThematique.sous_thematiques.length; index++) {
          const sous_thematique = groupThematique.sous_thematiques[index];
          for (let jndex = 0; jndex < sous_thematique.couches.length; jndex++) {
            const couche = sous_thematique.couches[jndex];
            if (true) {
              response.push({
                name: couche.nom,
                description: groupThematique.nom + ' / ' + sous_thematique.nom,
                id: couche.key_couche,
                source: 'geosmCatalogue'
              })
            }

          }
        }
      } else {
        for (let jndex = 0; jndex < groupThematique.couches.length; jndex++) {
          const couche = groupThematique.couches[jndex];
          if (true) {
            response.push({
              name: couche.nom,
              description: groupThematique.nom,
              id: couche.key_couche,
              source: 'geosmCatalogue'
            })
          }
        }
      }
    }

    return response
  }


}
