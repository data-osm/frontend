import { Component, OnInit, Inject } from '@angular/core';
import { coucheInterface, carteInterface } from 'src/app/type/type';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {StorageServiceService} from 'src/app/services/storage-service/storage-service.service'

/**
 * interface of the model to display a sheet properties
 */
export interface modelDescriptiveSheet{
  type:'osm',
  /**
   * layer
   */
  layer:coucheInterface|carteInterface
  /**
   * ol geometry
   */
  geometry?:any
  /**
   * Properties to displqy
   */
  properties:Object
}

@Component({
  selector: 'app-descriptive-sheet',
  templateUrl: './descriptive-sheet.component.html',
  styleUrls: ['./descriptive-sheet.component.scss']
})
/**
 * Dislplay different descriptive sheet
 * - osm type
 */
export class DescriptiveSheetComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public listLayers: modelDescriptiveSheet[],
    public dialogRef: MatDialogRef<DescriptiveSheetComponent>,
    public StorageServiceService:StorageServiceService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.dialogRef.close();
  }

}
