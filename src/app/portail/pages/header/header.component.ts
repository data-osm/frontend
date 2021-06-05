import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Map } from 'ol';
import { InfoComponent } from '../../../modal/info/info.component';
import { ChangeProfilComponent } from '../change-profil/change-profil.component';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input()map:Map
  
  constructor(
    public dialog:MatDialog
  ) { }

  ngOnInit(): void {
  }

  /**
   * open info modal
   */
  openModalInfo(){
    var proprietes = {
      disableClose: false,
      minWidth: 400,
    }

   
    const modal = this.dialog.open(InfoComponent, proprietes);
  }

  changeProfil(){
    this.dialog.open(ChangeProfilComponent,{minWidth: 400})
  }

}
