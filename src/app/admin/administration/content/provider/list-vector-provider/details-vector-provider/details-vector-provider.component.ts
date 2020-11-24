import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Data, Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { VectorProviderService } from '../../../../service/vector-provider.service'
import { manageCompHelper } from '../../../../../../../helper/manage-comp.helper'
import { catchError, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { DataForPreview, VectorProvider } from '../../../../../../type/type';
import { combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StyleService } from '../../../../service/style.service';

@Component({
  selector: 'app-details-vector-provider',
  templateUrl: './details-vector-provider.component.html',
  styleUrls: ['./details-vector-provider.component.scss']
})
export class DetailsVectorProviderComponent implements OnInit {
  
  onInitInstance: () => void;
  onPreviewInstance:()=>void;
  onDestroyInstance:()=>void

  private readonly notifier: NotifierService;

  vectorProvider:Observable<VectorProvider>

  constructor(
    public VectorProviderService:VectorProviderService,
    public StyleService:StyleService,
    public manageCompHelper:manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) { 
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
    }

    const onDestroy:Subject<any> = new Subject()
    this.onDestroyInstance = ()=>{
      onDestroy.next()
      onDestroy.complete()
    }

    const onPreview:Subject<void>=new Subject<void>()
    this.onPreviewInstance = ()=>{
      onPreview.next()
    }

    this.vectorProvider = onInit.pipe(
      switchMap(()=>{
        return  this.VectorProviderService.getVectorProvider(Number(this.route.snapshot.paramMap.get('id') )).pipe(
          catchError(()=>{
            this.router.navigate(['/admin/vector-provider']);
            return EMPTY
          }),
        )
      }),
      shareReplay(1)
    )

    combineLatest(
      this.vectorProvider,
      onPreview
    ).pipe(
      takeUntil(onDestroy),
      switchMap((result:[VectorProvider, void])=>{
        return this.StyleService.getAllStylesOfVectorProvider(result[0].provider_vector_id)
              .pipe(
                catchError(()=>{
                  this.notifier.notify('error'," Impossible to retrive style of this provider")
                  return EMPTY
                }),
                tap((styles)=>{
                  let previewData:DataForPreview = {
                    name:result[0].name,
                    url_server:result[0].url_server,
                    id_server:result[0].id_server,
                    style:styles.map((style)=> style.name),
                    extent:result[0].extent
                  }

                  this.manageCompHelper.openDataPreviewDialog([],[previewData])
                 
                })
              )
      })
    ).subscribe()
   
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngOnDestroy(){
    this.onDestroyInstance()
  }

  /**
   * reload vector provider
   */
  reloadVectorProvider(){
    this.onInitInstance()
  }

}
