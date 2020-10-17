import { Component, OnInit } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { catchError } from 'rxjs/internal/operators/catchError';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {manageCompHelper} from '../../../../../helper/manage-comp.helper'
import { Icon } from '../../../../type/type';
import {IconService} from '../../service/icon.service'
@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
/**
 * comp icon handle
 */
export class IconsComponent implements OnInit {

  private readonly notifier: NotifierService;
  url_prefix = environment.backend
  constructor(
    public manageCompHelper:manageCompHelper,
    public IconService:IconService,
    notifierService: NotifierService,
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {

  }


  /**
   * Add a group icon
   */
  addIcon(){
    this.manageCompHelper.openModalAddcon([],(response:boolean)=>{

    })
  }

  addIconInView(){
   
  }

}
