import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { Observable, Subject, ReplaySubject, combineLatest, EMPTY, merge } from 'rxjs';
import { DataForPreview, VectorProvider } from '../../../../../type/type';
import { VectorProviderService } from '../../../../administration/service/vector-provider.service'
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { StyleService } from '../../../../administration/service/style.service';
import { switchMap, catchError, shareReplay, takeUntil, tap, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { UpdateProviderComponent } from '../update-provider/update-provider.component';
import { environment } from '../../../../../../environments/environment';


@Component({
  selector: 'app-edit-vector-provider',
  templateUrl: './edit-vector-provider.component.html',
  styleUrls: ['./edit-vector-provider.component.scss']
})
export class EditVectorProviderComponent implements OnInit, OnChanges {

  @Input() provider_vector_id: number

  onInitInstance: () => void;
  onPreviewInstance: () => void;
  onDestroyInstance: () => void
  onUpdateInstance:(provider:VectorProvider)=>void

  private readonly notifier: NotifierService;

  vectorProvider$: Observable<VectorProvider>

  constructor(
    public VectorProviderService: VectorProviderService,
    public StyleService: StyleService,
    public manageCompHelper: ManageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public router:Router,
    public dialog:MatDialog
  ) {
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
    }

    const onDestroy: Subject<any> = new Subject()
    this.onDestroyInstance = () => {
      onDestroy.next()
      onDestroy.complete()
    }

    const onPreview: Subject<void> = new Subject<void>()
    this.onPreviewInstance = () => {
      onPreview.next()
    }

    const onUpdate:Subject<VectorProvider> = new Subject<VectorProvider>()
    this.onUpdateInstance = (provider:VectorProvider)=>{
      onUpdate.next(provider)
    }
    this.vectorProvider$ =merge(
      onInit.pipe(
        switchMap(() => {
          return this.VectorProviderService.getVectorProvider(Number(this.provider_vector_id)).pipe(
            catchError(() => {
              this.router.navigate(['/admin/vector-provider']);
              return EMPTY
            }),
          )
        }),
        
      ),
      onUpdate.pipe(
        switchMap((provider:VectorProvider)=>{
          return this.dialog.open(UpdateProviderComponent,{data:provider, width: '50%', maxWidth: '90%', maxHeight: '90%'}).afterClosed().pipe(
            filter(response => response),
            switchMap(()=>{
              return this.VectorProviderService.getVectorProvider(Number(this.provider_vector_id)).pipe(
                catchError(() => {
                  this.router.navigate(['/admin/vector-provider']);
                  return EMPTY
                }),
              )
            })
          )
        })
      )
    ).pipe(
      shareReplay(1)
    )

    combineLatest(
      this.vectorProvider$,
      onPreview
    ).pipe(
      takeUntil(onDestroy),
      switchMap((result: [VectorProvider, void]) => {
        return this.StyleService.getAllStylesOfVectorProvider(result[0].provider_vector_id)
          .pipe(
            catchError(() => {
              this.notifier.notify('error', " Impossible to retrive style of this provider")
              return EMPTY
            }),
            tap((styles) => {
              let previewData: DataForPreview = {
                name: result[0].name,
                url_server: environment.url_carto+result[0].path_qgis,
                id_server: result[0].id_server,
                style: styles.map((style) => style.name),
                extent: result[0].extent,
                type:'wms'
              }

              this.manageCompHelper.openDataPreviewDialog([], [previewData])

            })
          )
      })
    ).subscribe()


  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.provider_vector_id.currentValue){
      this.onInitInstance()
    }
  }
  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.onDestroyInstance()
  }

  /**
   * reload vector provider
   */
  reloadVectorProvider() {
    this.onInitInstance()
  }

}
