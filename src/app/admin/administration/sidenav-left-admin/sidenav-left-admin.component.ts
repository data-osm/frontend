import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Observable, Subject, ReplaySubject, merge, EMPTY } from 'rxjs';
import { switchMap, tap, catchError, filter } from 'rxjs/operators';
import { Map } from '../../../type/type';
import { manageCompHelper } from '../../../../helper/manage-comp.helper'
import { MapsService } from '../service/maps.service'
import { MatDialog } from '@angular/material/dialog';
import { AddMapComponent } from '../content/maps/add-map/add-map.component';
import { EditMapComponent } from '../content/maps/edit-map/edit-map.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-sidenav-left-admin',
  templateUrl: './sidenav-left-admin.component.html',
  styleUrls: ['./sidenav-left-admin.component.scss']
})
export class SidenavLeftAdminComponent implements OnInit {



  private readonly notifier: NotifierService;

  onInitInstance: () => void;
  onAddInstance: () => void;
  onUpdateIntance: (map: Map) => void;
  onDeleteInstance: (map: Map) => void;

  /**
   * the datasource of the table that list vector provider
   */
  maps: Observable<Map[]>

  /**
   * is comp interacting with backend ?
   */
  loading: boolean = true

  constructor(
    public MapsService: MapsService,
    public manageCompHelper: manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public translate: TranslateService,
    public dialog: MatDialog,
    public router:Router
  ) {
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
      onInit.complete();
    }

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next();
    }

    const onUpdate: Subject<Map> = new Subject<Map>()
    this.onUpdateIntance = (map: Map) => {
      onUpdate.next(map);
    }

    const onDelete: Subject<Map> = new Subject<Map>();
    this.onDeleteInstance = (map: Map) => {
      onDelete.next(map)
    }

    this.maps = merge(
      onInit.pipe(
        switchMap(() => {
          return this.MapsService.getAllMaps().pipe(
            tap(() => this.loading = false),
            catchError(() => { this.notifier.notify("error", "An error occured while loading maps"); return EMPTY })
          )
        })
      ),
      onAdd.pipe(
        switchMap(() => {
          return this.dialog.open(AddMapComponent, { disableClose: false, minWidth: 400 }).afterClosed().pipe(
            filter((response: boolean) => response),
            switchMap(() => {
              return this.MapsService.getAllMaps().pipe(
                tap(() => this.loading = false),
                catchError(() => { this.notifier.notify("error", "An error occured while loading maps"); return EMPTY })
              )
            })
          )
        })
      )
      ,
      onUpdate.pipe(
        switchMap((map: Map) => {
          return this.dialog.open(EditMapComponent, { disableClose: false, minWidth: 400, data: map }).afterClosed().pipe(
            filter((response: boolean) => response),
            switchMap(() => {
              return this.MapsService.getAllMaps().pipe(
                tap(() => this.loading = false),
                catchError(() => { this.notifier.notify("error", "An error occured while loading maps"); return EMPTY })
              )
            })
          )
        })
      ),
      onDelete.pipe(
        switchMap((map:Map)=>{
          return this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.map.delete_confirmation_title'),
            confirmationExplanation: this.translate.instant('admin.map.delete_confirmation_explanation')+' '+ map.name +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.MapsService.deleteMap(map).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting map"); return EMPTY }),
                switchMap(()=>{
                  return this.MapsService.getAllMaps().pipe(
                    tap(() => this.loading = false),
                    catchError(() => { this.notifier.notify("error", "An error occured while loading maps"); return EMPTY })
                  ) 
                })
              )
            })
          )
        })
      )
    )
  }

  ngOnInit(): void {
    this.onInitInstance();
  }

  navigateToMap(map:Map){
    this.router.navigate(['/admin','map',map.map_id])
  }

}
