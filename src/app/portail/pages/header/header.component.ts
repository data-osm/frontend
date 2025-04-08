import { Component, Input, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Map } from 'ol';
import { InfoComponent } from '../../../modal/info/info.component';
import { ChangeProfilComponent } from '../change-profil/change-profil.component';
import { Instance } from '../../../giro-3d-module';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input() map: Map
  @Input() instance: Instance

  constructor(
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
  }

  /**
   * open info modal
   */
  openModalInfo() {

    const modal = this.dialog.open(InfoComponent, {
      disableClose: false,
      minWidth: 400,
      height: "80%",
      maxHeight: "80%",
      position: {
        bottom: "5%"
      }
    });
  }

  changeProfil() {
    this.dialog.open(ChangeProfilComponent, { minWidth: 400 })
  }

}
