import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { Group } from '../../../../../type/type';
import {MapsService} from '../../../service/maps.service'
import { AddGroupComponent } from './group/add-group/add-group.component';
@Component({
  selector: 'app-detail-map',
  templateUrl: './detail-map.component.html',
  styleUrls: ['./detail-map.component.scss']
})
export class DetailMapComponent implements OnInit {

  onInitInstance: ()=>void
  onAddInstance: ()=>void
  onUpdateInstance: (group:Group)=>void
  onDeleteInstance: (group:Group)=>void

  private readonly notifier: NotifierService;

  /**
   * group list of a map
   */
  groups:Observable<Group[]>

  constructor(
    public MapsService:MapsService,
    public route: ActivatedRoute,
    notifierService: NotifierService,
    public dialog: MatDialog,
  ) { 

    this.notifier = notifierService;

    
    const onInit:ReplaySubject<void> = new ReplaySubject<void>()
    this.onInitInstance = ()=>{
      onInit.next()
      onInit.complete()
    }

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next();
    }

    const onUpdate: Subject<Group> = new Subject<Group>()
    this.onUpdateInstance = (group: Group) => {
      onUpdate.next(group);
    }

    this.groups = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
          )
        })
      ),
      onAdd.pipe(
        filter(()=>this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(()=>{
          return this.dialog.open(AddGroupComponent,{ disableClose: false, minWidth: 400, data: Number(this.route.snapshot.paramMap.get('id')) }).afterClosed().pipe(

          )
        })
      )
    )

  }

  ngOnInit(): void {
    this.onInitInstance()
  }

}
