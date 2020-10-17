import { Component, OnInit } from '@angular/core';
import {manageCompHelper} from '../../../../../helper/manage-comp.helper'
@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
/**
 * comp icon handle
 */
export class IconsComponent implements OnInit {

  constructor(
    public manageCompHelper:manageCompHelper
  ) { }

  ngOnInit(): void {
  }

  /**
   * Add a group icon
   */
  addIcon(){
    this.manageCompHelper.openModalAddcon([],(response:boolean)=>{

    })
  }

}
