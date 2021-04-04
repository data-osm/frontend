import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { combineLatest, EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import { AddLayerProviderComponent } from '../add-layer-provider/add-layer-provider.component';
import { TranslateService } from '@ngx-translate/core';
import { EditLayerProviderComponent } from '../edit-layer-provider/edit-layer-provider.component';
import { MatTable } from '@angular/material/table';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { MapsService } from '../../../../../../data/services/maps.service';
import { manageCompHelper } from '../../../../../../../helper/manage-comp.helper';
import { LayerProviders, Layer, ReorderProvider } from '../../../../../../type/type';



@Component({
  selector: 'app-provider',
  templateUrl: './provider.component.html',
  styleUrls: ['./provider.component.scss']
})
export class ProviderComponent implements OnInit, OnChanges {
  onInitInstance:()=>void
  onAddInstance:()=>void
  onDeleteInstance:(LayerProviders:LayerProviders)=>void
  onUpdateInstance:(LayerProviders:LayerProviders)=>void
  onReorderProvidersInstance:(reorderProviders:Array<ReorderProvider>)=>void

  @ViewChild('table') table: MatTable<LayerProviders>;


  @Input()layer:Layer
  
  providers:Observable<Array<LayerProviders>>
  // displayedColumns:Array<string>=['order','provider','style', 'action']

  private readonly notifier: NotifierService;

  constructor(
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
    public dialog: MatDialog,
    public manageCompHelper:manageCompHelper,
    public translate: TranslateService,
  ) { 
    this.notifier = notifierService;

    const onInit:ReplaySubject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onDelete:Subject<LayerProviders> = new Subject<LayerProviders>()

    this.onDeleteInstance = (layerProviders:LayerProviders)=>{
      onDelete.next(layerProviders)
    }

    const onUpdate:Subject<LayerProviders> = new Subject<LayerProviders>()

    this.onUpdateInstance = (layerProviders:LayerProviders)=>{
      onUpdate.next(layerProviders)
    }

    const onReorder:Subject<Array<ReorderProvider>> = new Subject<Array<ReorderProvider>>()

    this.onReorderProvidersInstance = (reorderProviders:Array<ReorderProvider>)=>{
      onReorder.next(reorderProviders)
    }

    this.providers = merge(
      onInit.pipe(
        filter(()=>this.layer != null),
        switchMap(()=>{
          return this.mapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
            map((providers)=>{
              return providers.sort(
                (a, b) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
              )
            })
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open(AddLayerProviderComponent,{data:this.layer}).afterClosed().pipe(
            filter(response=>response),
            switchMap(()=>{
              return this.mapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
                map((providers)=>{
                  return providers.sort(
                    (a, b) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
                  )
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((layerProviders: LayerProviders)=>{
          return this.dialog.open(EditLayerProviderComponent,{data:layerProviders.vp_id, maxHeight:"90%",maxWidth:"90%",width:"80%",height:"80%"}).afterClosed().pipe(
            switchMap(()=>{
              return this.mapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
                map((providers)=>{
                  return providers.sort(
                    (a, b) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
                  )
                })
              )
            })
          )
        })   
      ),
      onDelete.pipe(
        switchMap((layerProviders: LayerProviders) => {
          return this.manageCompHelper.openConfirmationDialog([],
            {
              confirmationTitle: this.translate.instant('list_provider_with_style.delete_title'),
              confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation') + layerProviders.vp.name + ' ?',
              cancelText: this.translate.instant('cancel'),
              confirmText: this.translate.instant('delete'),
            }
          ).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.mapsService.deleteProviderWithStyleOfLayer(layerProviders.id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting a provider"); return EMPTY }),
                switchMap(()=>{
                  return this.mapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
                    catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
                    map((providers)=>{
                      return providers.sort(
                        (a, b) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
                      )
                    })
                  )
                })
              )
            })
          )
        })
      ),
      onReorder.pipe(
        switchMap((reorderProviders:Array<ReorderProvider>)=>{
          return this.mapsService.reorderProvidersInLayerProviders(reorderProviders).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while re order providers"); return EMPTY }),
            switchMap(()=>{
              return this.mapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
                map((providers)=>{
                  return providers.sort(
                    (a, b) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
                  )
                })
              )
            })
          )
        })
      ),

    ).pipe(
      shareReplay(1)
    )
  }

  drop(event: CdkDragDrop<string[]>) {
    combineLatest(this.providers).pipe(
      take(1),
      tap((providers:[Array<LayerProviders>])=>{
        moveItemInArray(providers[0], event.previousIndex, event.currentIndex);
        
        let reorderProviders:Array<ReorderProvider> = providers[0].map(
          (provider,index)=>{
            return {
              id:provider.id,
              ordre:index
            }
          })
        this.onReorderProvidersInstance(reorderProviders)

      }),
    ).subscribe()
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.layer.currentValue){
      this.onInitInstance()
    }
  }

  ngOnInit(): void {
  }


}
