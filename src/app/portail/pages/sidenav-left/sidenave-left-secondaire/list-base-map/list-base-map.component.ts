import { Component, Inject, Input, OnInit } from '@angular/core';
import { Map } from 'ol';
import { BaseMap } from '../../../../../data/models/base-maps';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-list-base-map',
  templateUrl: './list-base-map.component.html',
  styleUrls: ['./list-base-map.component.scss']
})
export class ListBaseMapComponent implements OnInit {


  constructor(
    public dialogRef: MatDialogRef<ListBaseMapComponent>,
    @Inject(MAT_DIALOG_DATA) public parameters: { baseMaps: BaseMap[], map: Map }
  ) { }

  ngOnInit(): void {
  }

}
