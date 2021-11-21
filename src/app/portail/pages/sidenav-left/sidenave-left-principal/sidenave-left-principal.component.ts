import { Component, OnInit, Input, SimpleChange, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import {
  Map, OSM, TileLayer
} from '../../../../ol-module';
import { groupCarteInterface, carteInterface, groupThematiqueInterface, groupInterface, Group } from '../../../../type/type';
import * as $ from 'jquery'
import { CartoHelper } from '../../../../../helper/carto.helper'
import { ManageCompHelper } from '../../../../../helper/manage-comp.helper'
import { combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { BaseMap } from '../../../../data/models/base-maps';
import { catchError, filter, map, shareReplay, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { BaseMapsService } from '../../../../data/services/base-maps.service';
import { NotifierService } from 'angular-notifier';
import { TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ListBaseMapComponent } from '../sidenave-left-secondaire/list-base-map/list-base-map.component';
import { ViewContainerRef } from '@angular/core';
import { ListGroupThematiqueComponent } from '../sidenave-left-secondaire/list-group-thematique/list-group-thematique.component';
import { DataOsmLayersServiceService } from '../../../../services/data-som-layers-service/data-som-layers-service.service';
import { fromOpenLayerEvent } from '../../../../shared/class/fromOpenLayerEvent';
import { ObjectEvent } from 'ol/Object';


/**
 * first composant of the left sidenav
 */
@Component({
  selector: 'app-sidenave-left-principal',
  templateUrl: './sidenave-left-principal.component.html',
  styleUrls: ['./sidenave-left-principal.component.scss']
})
export class SidenaveLeftPrincipalComponent implements OnInit {

  onInitInstance:()=>void

  @Input() groups: Array<Group>
 /**
   * Map of the app
   */
  @Input() map: Map

  baseMaps$:Observable<Array<BaseMap>>

  environment = environment

  ghostMap = new Map({
    layers: [
      new TileLayer({
        source: new OSM(),
      }) 
    ],
  });

  @ViewChild('ghostMap') set myDiv(myDiv: ElementRef) {
    this.ghostMap.setTarget(myDiv.nativeElement)
  }

  principalMap:BaseMap

  principalMapForm:FormControl = new FormControl(true)

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private readonly notifier: NotifierService;

  constructor(
    public dataOsmLayersServiceService: DataOsmLayersServiceService,
    public baseMapsService: BaseMapsService,
    public manageCompHelper:ManageCompHelper,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog:MatDialog
  ) {
    this.notifier = notifierService;

    const onInit:Subject<void> = new ReplaySubject<void>(1)

    this.onInitInstance = ()=>{
      onInit.next()
    }
    
    this.baseMaps$ = onInit.pipe(
      switchMap(()=>{
        return this.baseMapsService.getBaseMaps().pipe(
          catchError((error: HttpErrorResponse) => {
            this.notifier.notify("error", this.translate.instant('portail.error_loading.basemaps') ) ;
            return EMPTY
          }),
          map((basemaps)=>{
            this.principalMap = basemaps.find((item)=>item.principal)?basemaps.find((item)=>item.principal):basemaps[0]
            return basemaps
          }),
          tap((baseMaps)=>{
            this.dataOsmLayersServiceService.baseMaps.next(baseMaps)
          })
        )
      }),
      shareReplay(1)
    )

   
    
    combineLatest( this.principalMapForm.valueChanges.pipe(startWith(true)),this.baseMaps$).pipe(
      filter((value)=> value[1].find((item)=>item.principal) != undefined ),
      tap((value)=>{
        if (value[0] == true) {
          this.addPrincipalMapLayer(value[1].find((item)=>item.principal) )
        }else{
          this.removePrincipalMapLayer(value[1].find((item)=>item.principal))
        }
      }),
      takeUntil(this.destroyed$)
    ).subscribe()
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngOnDestroy(){
    this.destroyed$.next()
    this.destroyed$.complete()
  }

  ngOnChanges(changes:SimpleChanges):void{
    if (changes.map ) {
      if (this.map) {
        this.ghostMap.setView(this.map.getView())

        combineLatest( fromOpenLayerEvent<ObjectEvent>(this.map.getLayers(),'propertychange'),this.baseMaps$)
        .pipe(
          takeUntil(this.destroyed$),
          filter((value)=> value[1].find((item)=>item.principal) != undefined ),
          tap((value)=>{
            let principalMap = value[1].find((item)=>item.principal) 
    
            let layer = new CartoHelper(this.map).getLayerByPropertiesCatalogueGeosm({
              couche_id: principalMap.id,
              type: 'carte'
            })
       
            if (layer.length > 0 && this.principalMapForm.value == false){
                this.principalMapForm.setValue(true)
            }else if (layer.length == 0 && this.principalMapForm.value == true) {
                this.principalMapForm.setValue(false)
            }
    
          })
        ).subscribe()

      }
    }
  }


  addPrincipalMapLayer(principalMap:BaseMap) {

      var type;
      if (principalMap.protocol_carto == 'wms') {
        type = 'wms'
      } else if (principalMap.protocol_carto == 'wmts') {
        type = 'xyz'
      }

      this.dataOsmLayersServiceService.addBaseMap(principalMap, this.map, {
        share:false,
        metadata:true,
        opacity:true,
        removable:false
      })

      let layerGhost = new CartoHelper(this.ghostMap).constructLayer(
        {
          nom: principalMap.name,
          type: type,
          type_layer: 'geosmCatalogue',
          url: principalMap.url,
          visible: true,
          inToc:true,
          properties: {
            couche_id: principalMap.id,
            type: 'carte',
          },
          tocCapabilities:{
            share:false,
            metadata:true,
            opacity:true,
            removable:false
          },
          iconImagette: environment.backend + '/' + principalMap.pictogramme.icon,
          descriptionSheetCapabilities:undefined
        }
      )
      
      while (this.ghostMap.getLayers().getLength() > 0 ) {
        this.ghostMap.removeLayer(this.ghostMap.getLayers().getArray()[0])
      }

      this.ghostMap.addLayer(layerGhost)

    
  }

  removePrincipalMapLayer(principalMap:BaseMap) {
    this.dataOsmLayersServiceService.removeBaseMap(principalMap.id, this.map)
  }
  /**
   * Open group  
   * @param group Group
   */
  openGroup(group: Group) {
    
    this.dialog.open(ListGroupThematiqueComponent,{
      data:{
        group:group,
        map:this.map
      },
      position:{
        left:'0px',
        bottom:'0px',
        top:'60px',
      },
      width:'260px',
      height:'calc(100% - 60px)',
      hasBackdrop:false,
      disableClose:true,
      panelClass:['dialog-no-shadow','dialog-no-padding'],
    })
  }

  /**
   * Open group carte slide
   * @param groupCarte groupCarteInterface
   */
  openGroupCarteSlide(baseMaps:BaseMap[]) {
    this.dialog.open(ListBaseMapComponent,{
      data:{
        baseMaps:baseMaps,
        map:this.map
      },
      position:{
        left:'0px',
        bottom:'0px',
        top:'60px',
      },
      width:'260px',
      height:'calc(100% - 60px)',
      hasBackdrop:false,
      disableClose:true,
      panelClass:['dialog-no-shadow','dialog-no-padding'],
    })
  }



}
