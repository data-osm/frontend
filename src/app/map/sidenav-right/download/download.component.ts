import { Component, OnInit } from '@angular/core';
import { coucheInterface, carteInterface, configProjetInterface } from 'src/app/type/type';
import { FormGroup, FormArray, FormBuilder, FormControl, AbstractControl, Validators } from '@angular/forms';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { BackendApiService } from 'src/app/services/backend-api/backend-api.service'
import { startWith, map, filter, debounceTime, tap } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { selectLayersForDownload, downloadModelInterface } from './download-select-layers'
import { GeoJSON } from 'src/app/ol-module';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

/**
 * Interface of the model return when user  search a emprise
 */
export interface responseOfSerachLimitInterface {
  /**
   * DB table corresponding
   */
  table: string
  /**
   * id DB of in the table
   */
  id: number
  /**
   * name of the limit
   */
  limitName: string
  /**
   * name
   */
  name: string
  ref: string
}

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
/**
 * Components for dowloads data purposes
 */
export class DownloadComponent extends selectLayersForDownload implements OnInit {

  /**
   * Configuration of the project
   */
  configProejct: configProjetInterface

  /**
   * forms use to choose emprise to make the download
   */
  formsEmprise: FormGroup;

  filterEmpriseOptions: responseOfSerachLimitInterface[] = []

  constructor(
    public BackendApiService: BackendApiService,
    public StorageServiceService: StorageServiceService,
    public fb: FormBuilder
  ) {
    super(StorageServiceService, fb)
  }

  ngOnInit(): void {
    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.configProejct = this.StorageServiceService.getConfigProjet()
        this.layersDownlodable = this.getAllLayersDownlodable()
        this.initialiseFormsLayers()

        if (this.configProejct.limites.length > 0) {
          this.downloadModel.roiType = 'emprise'
          this.initialiseFormsEmprise()
        } else {
          this.setRoiTypeToAll()
        }

      }
    })
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
        return from(this.BackendApiService.post_requete('/searchLimite', { 'word': value.toString() }))
      })
    ).subscribe((value: Observable<any>) => {

      value.subscribe((data) => {
        var response: Array<responseOfSerachLimitInterface> = []
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
  displayAutocompleEmpriseFn(emprise: responseOfSerachLimitInterface): string {
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
    var empriseInForm: responseOfSerachLimitInterface = option.option.value
    if (empriseInForm.table && empriseInForm.id) {

      this.getGeometryOfEmprise({ table: empriseInForm.table, id: empriseInForm.id })
    }
  }

  /**
   * get ol geometry of an emprise
   * @param params {table:string,id:number}
   */
  getGeometryOfEmprise(params: { table: string, id: number }) {
    this.BackendApiService.post_requete('/getLimitById', params).then(
      (response) => {
        var geojson = JSON.parse(response["geometry"])
        var feature = new GeoJSON().readFeature(
          geojson,
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }
        );
        this.downloadModel.roiGeometry = feature.getGeometry()
      },
      (err) => {

      }
    )
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
        featureProjection: "EPSG:4326",
      }
    );
    this.downloadModel.roiGeometry = feature.getGeometry()

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

}
