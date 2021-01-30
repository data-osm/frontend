import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { Observable, Subject, ReplaySubject, combineLatest, EMPTY } from 'rxjs';
import { DataForPreview, VectorProvider } from '../../../../../../../type/type';
import { VectorProviderService } from '../../../../../service/vector-provider.service'
import { manageCompHelper } from '../../../../../../../../helper/manage-comp.helper'
import { StyleService } from '../../../../../service/style.service';
import { switchMap, catchError, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { Router } from '@angular/router';


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

  private readonly notifier: NotifierService;

  vectorProvider: Observable<VectorProvider>

  constructor(
    public VectorProviderService: VectorProviderService,
    public StyleService: StyleService,
    public manageCompHelper: manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public router:Router
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

    this.vectorProvider = onInit.pipe(
      switchMap(() => {
        return this.VectorProviderService.getVectorProvider(Number(this.provider_vector_id)).pipe(
          catchError(() => {
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
                url_server: result[0].url_server,
                id_server: result[0].id_server,
                style: styles.map((style) => style.name),
                extent: result[0].extent
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
