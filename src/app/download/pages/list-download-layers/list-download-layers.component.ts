import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { FeatureToDownload } from '../../../data/models/download';
import { AdminBoundaryRespone } from '../../../data/models/parameters';


@Component({
  selector: 'app-list-download-layers',
  templateUrl: './list-download-layers.component.html',
  styleUrls: ['./list-download-layers.component.scss']
})
/**
 * List all couches with a link for thier download
 */
export class ListDownloadLayersComponent implements OnInit {

  environment = environment
  data:{[key:string]:FeatureToDownload[]}
  objectKeys = Object
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public parameter : {countFeatures: FeatureToDownload[], adminBoundarySelected:AdminBoundaryRespone},
    public dialogRef: MatDialogRef<ListDownloadLayersComponent>,
  ) {
      this.data = this.parameter.countFeatures.reduce(function (r, a) {
        r[a.layer_name] = r[a.layer_name] || [];
        r[a.layer_name].push(a);
        return r;
      }, Object.create(null));
  }

  ngOnInit(): void {
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.dialogRef.close();
  }


}
