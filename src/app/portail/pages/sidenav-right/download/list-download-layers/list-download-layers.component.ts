import { Component, OnInit ,Inject} from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { coucheInterface, groupThematiqueInterface } from '../../../../../type/type';
import { environment } from '../../../../../../environments/environment';
/**
 * Interface that descrive one layer that can be download
 */
export interface downloadDataModelInterface{
  index: number
  /**
   * name of the file
   */
  nom: string
  /**
   * Url to download file
   */
  url: string
  /**
   *  number of features
   */
  number: number
  /**id of the layer in DB */
  id: number,
  layer:coucheInterface
  groupThematique:groupThematiqueInterface
  /** name of the region of interest : paris, yaounde, kinshasa etc... */
  empriseName
}

@Component({
  selector: 'app-list-download-layers',
  templateUrl: './list-download-layers.component.html',
  styleUrls: ['./list-download-layers.component.scss']
})
/**
 * List all couches with a link for thier download
 */
export class ListDownloadLayersComponent implements OnInit {

  environment=environment

  constructor(
    @Inject(MAT_DIALOG_DATA) public listLayers: downloadDataModelInterface[],
    public dialogRef: MatDialogRef<ListDownloadLayersComponent>,
  ) { }

  ngOnInit(): void {
    this.formatLayers()
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.dialogRef.close();
  }

  /**
   * Format list of layer to download
   */
  formatLayers(){
    for (let index = 0; index < this.listLayers.length; index++) {
      //  this.listLayers[index].layer = this.StorageServiceService.getCoucheFromKeyCouche(this.listLayers[index].id)
      //  this.listLayers[index].groupThematique = this.StorageServiceService.getGroupThematiqueFromIdCouche(this.listLayers[index].id)
    }
    console.log(this.listLayers)
  }

}
