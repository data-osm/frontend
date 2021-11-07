import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { FeatureToDownload } from '../../../data/models/download';
import { AdminBoundaryRespone } from '../../../data/models/parameters';
import { Layer } from '../../../type/type';


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
  data:{[key:string]:Layer} = {}
  objectKeys = Object
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public parameter : {countFeatures: FeatureToDownload[], provider_vector_id:number, table_id:number, name:string},
    public dialogRef: MatDialogRef<ListDownloadLayersComponent>,
  ) {
    let countFeatures:FeatureToDownload[] = JSON.parse(JSON.stringify(this.parameter.countFeatures));

      let a:{[key:string]:FeatureToDownload[]}  = countFeatures.reduce(function (r, a) {
        r[a.layer_name] = r[a.layer_name] || [];
        r[a.layer_name].push(a);
        return r;
      }, Object.create(null));

      for (const key in a) {
        if (Object.prototype.hasOwnProperty.call(a, key)) {
          const element = a[key];
          let layer = element[0].layer
          layer.providers.map((pr)=>{
            console.log(countFeatures.find((dow)=>dow.vector.provider_vector_id ==pr.vp.provider_vector_id))
            pr.vp.count = countFeatures.find((dow)=>dow.vector.provider_vector_id ==pr.vp.provider_vector_id).count
          })
          
          this.data[element[0].layer_name]=  layer
        }
      }

      console.log(countFeatures, this.data)

     
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
