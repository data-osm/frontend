import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { MatDialogRef } from '@angular/material/dialog';
import * as moment from 'moment'

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
  ) { }

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
