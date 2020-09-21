import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {

  environment = environment

  constructor(
    public dialogRef: MatDialogRef<InfoComponent>,
  ) { }

  ngOnInit(): void {
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  openUrl(url) {
    window.open(url, '_blank')
  }

}
