import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Observable, Subject, ReplaySubject, merge, EMPTY } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Map } from '../../../type/type';
import { manageCompHelper } from '../../../../helper/manage-comp.helper'
import { MapsService } from '../service/maps.service'
@Component({
  selector: 'app-sidenav-left-admin',
  templateUrl: './sidenav-left-admin.component.html',
  styleUrls: ['./sidenav-left-admin.component.scss']
})
export class SidenavLeftAdminComponent implements OnInit {

  

  private readonly notifier: NotifierService;

  onInitInstance: () => void;
  onAddInstance: () => void;
  deleteVectorInstance:(ids:number[]) => void;

  /**
   * the datasource of the table that list vector provider
   */
  maps:Observable<Map[]>

  /**
   * is comp interacting with backend ?
   */
  loading:boolean=true

  constructor(
    public MapsService:MapsService,
    public manageCompHelper:manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public translate: TranslateService,

  ) { 
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
      onInit.complete();
    }

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }
    
    const onDelete :Subject<number[]> = new Subject<number[]>();
    this.deleteVectorInstance = (ids:number[])=>{
      onDelete.next(ids)
    }

    this.maps = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.MapsService.getAllMaps().pipe(
            tap(() => this.loading = false),
            catchError(()=>{this.notifier.notify("error", "An error occured while loading maps");return EMPTY})
          )
        })
      ),
    )
  }

  ngOnInit(): void {
    this.onInitInstance();
  }

}
