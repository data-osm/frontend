import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../../../environments/environment';
import { BaseMap } from '../../../../../data/models/base-maps';
import { DataForPreview } from '../../../../../type/type';
import { PreviewDataComponent } from '../../../../administration/modal/preview-data/preview-data.component';

@Component({
  selector: 'app-base-map',
  templateUrl: './base-map.component.html',
  styleUrls: ['./base-map.component.scss']
})
export class BaseMapComponent implements OnInit {

  @Input() baseMap: BaseMap

  @Output() delete: EventEmitter<BaseMap> = new EventEmitter()
  @Output() update: EventEmitter<BaseMap> = new EventEmitter()

  environment = environment

  constructor(
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
  }

  preview(baseMap: BaseMap):void {
    let data: DataForPreview = {
      name: baseMap.name,
      url_server: baseMap.url,
      type: baseMap.protocol_carto,
      style: [],
      id_server: baseMap.identifiant,
      extent: undefined,
      attributions:baseMap.attribution
    }
    this.dialog.open(PreviewDataComponent, {
      data: [data],
      minWidth: 400,
      disableClose: false,
      width: (window.innerWidth - 200) + 'px',
      maxWidth: (window.innerWidth - 200) + 'px',
      height: (window.innerHeight - 150) + 'px',
      maxHeight: (window.innerHeight - 150) + 'px',
    })
  }

}
