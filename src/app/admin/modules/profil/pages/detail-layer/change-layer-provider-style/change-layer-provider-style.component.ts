import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { tap, switchMap, catchError, withLatestFrom, map, filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { ManageCompHelper } from '../../../../../../../helper/manage-comp.helper';
import { MapsService } from '../../../../../../data/services/maps.service';
import { AddStyle, CustomStyle, Style, VectorProvider, Layer, LayerProviders } from '../../../../../../type/type';
import { IconService } from '../../../../../administration/service/icon.service';
import { StyleService } from '../../../../../administration/service/style.service';
import { VectorProviderService } from '../../../../../administration/service/vector-provider.service';

@Component({
  selector: 'app-change-layer-provider-style',
  templateUrl: './change-layer-provider-style.component.html',
  styleUrls: ['./change-layer-provider-style.component.scss']
})
export class ChangeLayerProviderStyleComponent implements OnInit {

  public onAddStyleToSource:(CustomStyle)=>void
  public onChangeStyleInstance:()=>void

  private readonly notifier: NotifierService;

  searchtVectorProviderForm: FormGroup = this.fb.group({})
  searchResultVectorProvider: Observable<VectorProvider[]>

  customStyles$: Observable<CustomStyle[]>

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  environment=environment
  VectorProviderForm: FormGroup
  
  selectedProviderStyle: Observable<Style[]>

  selectedProvider: VectorProvider

  constructor(
    public vectorProviderService: VectorProviderService,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public translate: TranslateService,
    public styleService: StyleService,
    public mapsService: MapsService,
    public iconService: IconService,
    public manageCompHelper:ManageCompHelper,
    public router:Router,
    public dialogRef: MatDialogRef<ChangeLayerProviderStyleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {layerProviders: LayerProviders, layer:Layer},
  ) { 
    this.notifier = notifierService;
    this.selectedProvider = this.data.layerProviders.vp

    this.VectorProviderForm = this.fb.group({
      layer_id: new FormControl(this.data.layer.layer_id, [Validators.required]),
      vp_id: new FormControl(this.data.layerProviders.vp_id, [Validators.required]),
      vs_id: new FormControl(this.data.layerProviders.vs_id, [Validators.required]),
    })

    

    const onAddStyleToSource:Subject<CustomStyle> = new Subject<CustomStyle>()
    this.onAddStyleToSource = (customStyle)=>{
      onAddStyleToSource.next(customStyle)
    }

    this.selectedProviderStyle = 
    merge(
      of(this.selectedProvider).pipe(
        tap((provider: VectorProvider) => { this.VectorProviderForm.get('vp_id').setValue(provider.provider_vector_id), this.VectorProviderForm.get('vs_id').setValue(null) }),
        switchMap((provider: VectorProvider) => {
          return this.styleService.getAllStylesOfVectorProvider(provider.provider_vector_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading styles of source "); return EMPTY }),
            tap((styles:Style[])=>{
                if (styles.length>0) {
                  this.VectorProviderForm.get('vs_id').setValue(styles[0].provider_style_id)
                }
            })
          )
        })
      ),
      onAddStyleToSource.pipe(
        withLatestFrom(of(this.selectedProvider)),
        switchMap(([customStyle,vectorProvider])=>{
          return this.iconService.getIcon(this.data.layer.icon).pipe(
            catchError((e)=>{
              this.notifier.notify('error', "An error occured when getting the icon of the layer")
              return EMPTY
            }),
            map((icon)=>{return {customStyle,vectorProvider,icon} } )
          )
        }),
        switchMap((parameters)=>{
          let dataToAddStyle:AddStyle = {
            provider_vector_id:parameters.vectorProvider.provider_vector_id,
            customStyle:parameters.customStyle,
            color:this.data.layer.color,
            icon_background:this.data.layer.icon_background,
            icon_color:this.data.layer.icon_color,
            icon:parameters.icon,
            name:(this.data.layer.name+'_'+parameters.customStyle.name).replace(/[^a-zA-Z ]/g, "_")
          }
          return this.manageCompHelper.openAddStyleDialog([],dataToAddStyle)
            .pipe(
              filter(response => response != undefined),
              switchMap((response) => {
                return this.styleService.getAllStylesOfVectorProvider(parameters.vectorProvider.provider_vector_id).pipe(
                  catchError(() => { this.notifier.notify("error", "An error occured while loading styles of provider "); return EMPTY }),
                  tap((styles:Style[])=>{
                      if (styles.length>0) {
                        this.VectorProviderForm.get('vs_id').setValue(response.provider_style_id)
                      }
                  })
                )
              })
            )
        })
      )
    )
   

    this.customStyles$ = of(this.selectedProvider).pipe(
      switchMap((provider: VectorProvider) => {
        return this.styleService.listCustomStylesOfGeometryType(provider.geometry_type).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while loading custom styles of source "); return EMPTY }),
        )
      })
    )

    const onChangeStyle: Subject<void> = new Subject<void>()
    this.onChangeStyleInstance = () => {
      onChangeStyle.next()
    }

    onChangeStyle.pipe(
      tap(()=>{this.VectorProviderForm.disable()}),
      switchMap(() => {
        return this.mapsService.updateProviderWithStyleOfLayer(this.data.layerProviders.id, this.VectorProviderForm.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while updating source"); this.VectorProviderForm.enable();return EMPTY }),
          tap(() => { this.VectorProviderForm.enable();this.dialogRef.close(true) })
        )
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  ngOnInit(): void {
  }

  close() {
    this.dialogRef.close(false)
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  addProviderInNewWindow() {
   
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/admin/vector-provider'])
    );
  
    window.open(url, '_blank');
    
  }

}
