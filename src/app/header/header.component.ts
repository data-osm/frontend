import { Component, OnInit } from '@angular/core';
import {manageCompHelper} from 'src/helper/manage-comp.helper'
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(
    public manageCompHelper:manageCompHelper
  ) { }

  ngOnInit(): void {
  }

  /**
   * open info modal
   */
  openModalInfo(){
    this.manageCompHelper.openModalInfo([])
  }

}
