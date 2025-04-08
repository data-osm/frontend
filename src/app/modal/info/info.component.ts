import { Component, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import * as moment from 'moment'
import { environment } from '../../../environments/environment';
import { ParametersService } from '../../data/services/parameters.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {
  lastSaturday = moment().subtract(1, 'weeks').isoWeekday(6).locale("fr");
  environment = environment

  constructor(
    public dialogRef: MatDialogRef<InfoComponent>,
    public parameterService:ParametersService
  ) { 
  }

  ngOnInit(): void {
    // let lastSaturday = moment().isoWeekday(6).locale("fr");
    // console.log(lastSaturday.format("dddd DD-MM-YYYY "))
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  openUrl(url) {
    window.open(url, '_blank')
  }

}
