import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Observable, Subject, ReplaySubject, merge, EMPTY, of } from 'rxjs';
import { switchMap, tap, catchError, filter, takeUntil, distinct, startWith, map, shareReplay } from 'rxjs/operators';
import { Map } from '../../../../type/type';
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import { MapsService } from '../../../../data/services/maps.service'
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {MatLegacySelectionList as MatSelectionList, MatLegacySelectionListChange as MatSelectionListChange} from '@angular/material/legacy-list';
import { AddMapComponent } from '../add-map/add-map.component';
import { EditMapComponent } from '../edit-map/edit-map.component';


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

  activePte:Observable<{
    map_id:number,
    path:string,
  }>

  @ViewChild('MatSelectionList') mapSelectionList :MatSelectionList

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * is comp interacting with backend ?
   */
  loading: boolean = true

  constructor(
    public MapsService: MapsService,
    public manageCompHelper: ManageCompHelper,
    notifierService: NotifierService,
    public fb: UntypedFormBuilder,
    public translate: TranslateService,
    public dialog: MatDialog,
    public router:Router,
    public route:ActivatedRoute
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

    this.activePte = this.router.events.pipe(
      startWith(undefined),
      filter(e => e instanceof NavigationEnd || e == undefined),
      filter(() => this.route.children.length > 0),
      switchMap(() => { 
        return this.route.params 
      }),
      switchMap((parameters)=>{ 
        return this.route.firstChild.url.pipe(
          map((url)=>{
            let path:string;
            if (url.length > 0) {
              path = url[0].path
            }
            return {
              map_id:parameters['id'],
              path:path
            }
          })
        );
      }),
      shareReplay(1)
    )

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

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ngAfterViewInit(){
    this.mapSelectionList.selectionChange.pipe(
      tap((value:MatSelectionListChange)=>{ this.router.navigate(['/admin','profil',value.options[0].value]) }),
      takeUntil(this.destroyed$),
    ).subscribe()
  }

}