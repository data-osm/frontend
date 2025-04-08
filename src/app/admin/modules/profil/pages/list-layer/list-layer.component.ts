import { Component, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { filter, switchMap, catchError, tap, startWith, withLatestFrom, map, takeUntil, take, shareReplay, distinct } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper';
import { MapsService } from '../../../../../data/services/maps.service';
import { PreviewDataComponent } from '../../../../../shared/pages/preview-data/preview-data.component';
import { DataForPreview, Layer } from '../../../../../type/type';
import { AddLayerComponent } from '../add-layer/add-layer.component';
import { DetailLayerComponent } from '../detail-layer/detail-layer.component';
import { UpdateLayerComponent } from '../update-layer/update-layer.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-list-layer',
  templateUrl: './list-layer.component.html',
  styleUrls: ['./list-layer.component.scss']
})
/**
 * list all layers of a sub group
 */
export class ListLayerComponent implements OnInit {

  onAddInstance: () => void
  onSelectInstance: (layer: Layer) => void
  onDeleteInstance: (layer: Layer) => void
  onUpdateInstance: (layer: Layer) => void
  onPreviewInstance: (layer: Layer) => void
  onChangeLayerPrincipalInstance: (layer: Layer) => void


  layerList: Observable<Layer[]>

  sub_id: ReplaySubject<number> = new ReplaySubject(1)

  displayedColumns: Array<string> = ['square_icon', 'name', 'detail']
  environment = environment

  private readonly notifier: NotifierService;
  constructor(
    public mapsService: MapsService,
    public route: ActivatedRoute,
    public router: Router,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper: ManageCompHelper,
    public translate: TranslateService,
    private cdRef: ChangeDetectorRef
  ) {
    this.notifier = notifierService;
    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next()
    }

    const onDelete: Subject<Layer> = new Subject<Layer>()
    this.onDeleteInstance = (layer: Layer) => {
      onDelete.next(layer)
    }

    const onUpdate: Subject<Layer> = new Subject<Layer>()
    this.onUpdateInstance = (layer: Layer) => {
      onUpdate.next(layer)
    }

    const onChangeLayerPrincipal: Subject<Layer> = new Subject<Layer>()
    this.onChangeLayerPrincipalInstance = (layer: Layer) => {
      onChangeLayerPrincipal.next(layer)
    }

    const onSelect: Subject<Layer> = new Subject<Layer>()

    this.layerList = merge(
      this.router.events.pipe(
        startWith(undefined),
        filter(e => e instanceof NavigationEnd || e == undefined),
        map(() => this.route.snapshot),
        map(route => {

          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        // filter((route)=>route.component["name"]==="ListLayerComponent"),
        filter((route) => route.params['sub-id'] != undefined),
        // distinct((parameters)=>parameters['sub-id']),
        switchMap((route: ActivatedRouteSnapshot) => {
          let parameters = route.params
          this.sub_id.next(Number(parameters['sub-id']))
          this.cdRef.detectChanges();
          return this.mapsService.getAllLayersFromSubGroup(Number(parameters['sub-id'])).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
          )
        }),
      ),
      onAdd.pipe(
        withLatestFrom(this.sub_id),
        switchMap((parameters: [void, number]) => {
          return this.dialog.open(AddLayerComponent, { data: parameters[1], width: '90%', maxWidth: '90%', maxHeight: '90%', }).afterClosed().pipe(
            filter(response => response),
            switchMap(() => {
              return this.mapsService.getAllLayersFromSubGroup(parameters[1]).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
              )
            })
          )
        })
      ),
      onChangeLayerPrincipal.pipe(
        switchMap((layer: Layer) => {
          return this.mapsService.changeLayerPrincipal(layer, !layer.principal).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while updating principal layer "); return EMPTY }),
            // filter(response=>response),
            withLatestFrom(this.sub_id),
            switchMap((parameters) => {
              return this.mapsService.getAllLayersFromSubGroup(parameters[1]).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((layer: Layer) => {
          return this.dialog.open(UpdateLayerComponent, { data: layer, width: '90%', maxWidth: '90%', maxHeight: '90%' }).afterClosed().pipe(
            filter(response => response),
            withLatestFrom(this.sub_id),
            switchMap((parameters) => {
              return this.mapsService.getAllLayersFromSubGroup(parameters[1]).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
              )
            })
          )
        })
      ),
      onDelete.pipe(
        switchMap((layer: Layer) => {
          return this.manageCompHelper.openConfirmationDialog([],
            {
              confirmationTitle: this.translate.instant('list_layer.delte_layer'),
              confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation') + layer.name + ' ?',
              cancelText: this.translate.instant('cancel'),
              confirmText: this.translate.instant('delete'),
            }
          ).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(() => {
              return this.mapsService.deleteLayer(layer.layer_id).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting a layer "); return EMPTY }),
                withLatestFrom(this.sub_id),
                switchMap((parameters) => {
                  return this.mapsService.getAllLayersFromSubGroup(parameters[1]).pipe(
                    catchError(() => { this.notifier.notify("error", "An error occured while loading layers "); return EMPTY }),
                  )
                })
              )
            })
          )
        })
      )
    ).pipe(
      shareReplay(1)
    )

    this.onSelectInstance = (layer: Layer) => {
      onSelect.next(layer)
    }

    onSelect.pipe(
      tap((layer: Layer) => {
        this.dialog.open(DetailLayerComponent, { data: layer.layer_id, width: '90%', maxWidth: '90%', maxHeight: '90%', })
      })
    ).subscribe()

    const onPreview: Subject<Layer> = new Subject<Layer>()
    this.onPreviewInstance = (layer: Layer) => {
      onPreview.next(layer)
    }

    onPreview.pipe(
      switchMap((layer) => {
        return this.mapsService.getProviderWithStyleOfLayer(layer.layer_id).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while loading providers with style "); return EMPTY }),
          map((providers) => {
            return providers.sort(
              (b, a) => a.ordre > b.ordre ? 1 : a.ordre === b.ordre ? 0 : -1
            )
          }),
          tap((providers) => {
            let dataForPreview: Array<DataForPreview> = providers.map((provider) => {
              return {
                name: provider.vp.name,
                style: [provider.vs.name],
                id_server: provider.vp.id_server,
                url_server: environment.url_carto + provider.vp.path_qgis,
                extent: provider.vp.extent,
                type: 'wms'
              }
            })

            this.dialog.open(PreviewDataComponent, {
              data: dataForPreview,
              minWidth: 400,
              disableClose: false,
              width: (window.innerWidth - 200) + 'px',
              maxWidth: (window.innerWidth - 200) + 'px',
              height: (window.innerHeight - 150) + 'px',
              maxHeight: (window.innerHeight - 150) + 'px',
            })

          })
        )
      })
    ).subscribe()
  }

  ngOnInit(): void {
  }

}
