import { Component, OnInit } from '@angular/core';
import { coucheInterface, carteInterface } from 'src/app/type/type';
import { FormGroup, FormArray, FormBuilder, FormControl, AbstractControl } from '@angular/forms';
import { StorageServiceService } from 'src/app/services/storage-service/storage-service.service'
import { startWith, map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import {selectLayersForDownload} from './download-select-layers'

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
/**
 * Components for dowloads data purposes
 */
export class DownloadComponent extends selectLayersForDownload implements OnInit  {


  constructor(
    public StorageServiceService: StorageServiceService,
    public fb: FormBuilder
  ) {
    super(StorageServiceService,fb)
   }

  ngOnInit(): void {
    this.StorageServiceService.states.subscribe((value) => {
      if (value.loadProjectData) {
        this.layersDownlodable = this.getAllLayersDownlodable()
        this.initialiseFormsLayers()
      }
    })
  }

}
