import { Component, Inject, Input, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Map } from 'ol';
import { BaseMap } from '../../../../../data/models/base-maps';

@Component({
  selector: 'app-list-base-map',
  templateUrl: './list-base-map.component.html',
  styleUrls: ['./list-base-map.component.scss']
})
export class ListBaseMapComponent implements OnInit {

  
  constructor(
    public dialogRef: MatDialogRef<ListBaseMapComponent>,
    @Inject(MAT_DIALOG_DATA) public parameters: {baseMaps:BaseMap[], map:Map}
  ) { }

  ngOnInit(): void {
  }

}
