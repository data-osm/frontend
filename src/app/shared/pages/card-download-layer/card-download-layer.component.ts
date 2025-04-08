import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { merge, ReplaySubject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { FeatureToDownload } from '../../../data/models/download';
import { Layer } from '../../../type/type';

@Component({
  selector: 'app-card-download-layer',
  templateUrl: './card-download-layer.component.html',
  styleUrls: ['./card-download-layer.component.scss']
})
export class CardDownloadLayerComponent implements OnInit {

  @Input() layer: Layer
  @Input() provider_vector_id: number
  @Input() table_id: number
  @Input() layer_name: string
  @Input() boundary_name: string

  environment = environment
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  @ViewChildren(CdkCopyToClipboard) copyClipboards: QueryList<CdkCopyToClipboard>

  constructor(
    public notifierService: NotifierService,
    public translate: TranslateService,
  ) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    if (this.copyClipboards) {
      merge(...this.copyClipboards.map((item) => item.copied)).pipe(
        takeUntil(this.destroyed$),
        tap(() => {
          this.notifierService.notify('success', this.translate.instant('dowloadLayers.copy_link_succeed'))
        })
      ).subscribe()
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
