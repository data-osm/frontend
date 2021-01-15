import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { Layer, LayerProviders } from '../../../../../../../../../../../type/type';
import {MapsService} from '../../../../../../../../../service/maps.service'
import { AddLayerProviderComponent } from '../add-layer-provider/add-layer-provider.component';

@Component({
  selector: 'app-provider',
  templateUrl: './provider.component.html',
  styleUrls: ['./provider.component.scss']
})
export class ProviderComponent implements OnInit, OnChanges {
  onInitInstance:()=>void
  onAddInstance:()=>void

  @Input()layer:Layer
  
  providers:Observable<Array<LayerProviders>>
  displayedColumns:Array<string>=['provider','style', 'action']

  private readonly notifier: NotifierService;

  constructor(
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService,
    public dialog: MatDialog,
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

    this.providers = merge(
      onInit.pipe(
        filter(()=>this.layer != undefined),
        switchMap(()=>{
          return this.MapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open(AddLayerProviderComponent,{data:this.layer}).afterClosed().pipe(
            filter(response=>response),
            switchMap(()=>{
              return this.MapsService.getProviderWithStyleOfLayer(this.layer.layer_id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
              )
            })
          )
        })
      )
    )
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.layer.currentValue){
      this.onInitInstance()
    }
  }

  ngOnInit(): void {
  }


}
