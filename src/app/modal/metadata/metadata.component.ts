import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';

export interface MetaDataInterface {
  metadata
  nom
  url_prefix
  exist:boolean
}


@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss']
})
/**
 * Metadata Modal
 */
export class MetadataLayerComponent implements OnInit {

  url_prefix:string
  data_metadata

  constructor(
    public dialogRef: MatDialogRef<MetadataLayerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MetaDataInterface,
    private builder: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.url_prefix = this.data['url_prefix']

    if (this.data['exist']) {
      var partenaire = []

      if ( this.data['metadata'].partenaire && this.data['metadata'].partenaire.length > 0) {

        for (var index = 0; index < this.data['metadata'].partenaire.length; index++) {
          partenaire.push(this.data['metadata'].partenaire[index].id_user);
        }

      }

    }

    this.data_metadata = this.data
    console.log(this.data_metadata)
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
