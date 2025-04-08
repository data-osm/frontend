import { Component, Input, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-sidenav-header',
  templateUrl: './sidenav-header.component.html',
  styleUrls: ['./sidenav-header.component.scss']
})
export class SidenavHeaderComponent implements OnInit {

  @Input() backgroundColor?:string
  @Input() logo?:string 
  @Input() title:string
  @Input() dialogRef:MatDialogRef<any>

  constructor() { }

  ngOnInit(): void {
  }

  close(){
    this.dialogRef.close()
  }

}
