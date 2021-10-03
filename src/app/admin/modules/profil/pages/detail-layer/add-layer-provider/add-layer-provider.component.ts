import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, merge, EMPTY, of } from 'rxjs';
import { catchError, filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MapsService } from '../../../../../../data/services/maps.service';
import { VectorProvider, Layer, Style, CustomStyle, AddStyle } from '../../../../../../type/type';
import { StyleService } from '../../../../../administration/service/style.service';
import { VectorProviderService } from '../../../../../administration/service/vector-provider.service';
import { environment } from '../../../../../../../environments/environment';
import { IconService } from '../../../../../administration/service/icon.service';
import { ManageCompHelper } from '../../../../../../../helper/manage-comp.helper';

@Component({
  selector: 'app-add-layer-provider',
  templateUrl: './add-layer-provider.component.html',
  styleUrls: ['./add-layer-provider.component.scss']
})
/**
 * select one or multiple vector providers with a style
 */
export class AddLayerProviderComponent implements OnInit {

  onAddInstance: () => void
  public onAddStyleToSource:(CustomStyle)=>void

  private readonly notifier: NotifierService;
  displayedColumns: string[] = ['option', 'provider', 'style'];

  searchtVectorProviderForm: FormGroup = this.fb.group({})
  searchResultVectorProvider: Observable<VectorProvider[]>

  selectedProvider: Subject<VectorProvider> = new ReplaySubject<VectorProvider>(1)
  selectedProviderStyle: Observable<Style[]>

  customStyles$: Observable<CustomStyle[]>

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  environment=environment
  VectorProviderForm: FormGroup

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
    public dialogRef: MatDialogRef<AddLayerProviderComponent>,
    @Inject(MAT_DIALOG_DATA) public layer: Layer,
  ) {
    this.notifier = notifierService;

    this.VectorProviderForm = this.fb.group({
      layer_id: new FormControl(this.layer.layer_id, [Validators.required]),
      vp_id: new FormControl(null, [Validators.required]),
      vs_id: new FormControl(null, [Validators.required]),
    })

    let searchControl = new FormControl(null, Validators.min(3))

    this.searchResultVectorProvider = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' && search_word.length > 2),
      catchError((err) => of([])),
      switchMap((search_word: string) => {
        return this.vectorProviderService.searchVectorProvider(search_word).pipe(
          catchError(()=>EMPTY)
        )
      })
    )

    this.searchtVectorProviderForm.addControl('search_word', searchControl)

    const onAddStyleToSource:Subject<CustomStyle> = new Subject<CustomStyle>()
    this.onAddStyleToSource = (customStyle)=>{
      onAddStyleToSource.next(customStyle)
    }

    this.selectedProviderStyle = 
    merge(
      this.selectedProvider.pipe(
        tap((provider: VectorProvider) => { this.VectorProviderForm.get('vp_id').setValue(provider.provider_vector_id), this.VectorProviderForm.get('vs_id').setValue(null) }),
        switchMap((provider: VectorProvider) => {
          return this.styleService.getAllStylesOfVectorProvider(provider.provider_vector_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading styles of provider "); return EMPTY }),
            tap((styles:Style[])=>{
                if (styles.length>0) {
                  this.VectorProviderForm.get('vs_id').setValue(styles[0].provider_style_id)
                }
            })
          )
        })
      ),
      onAddStyleToSource.pipe(
        withLatestFrom(this.selectedProvider),
        switchMap(([customStyle,vectorProvider])=>{
          return this.iconService.getIcon(this.layer.icon).pipe(
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
            color:this.layer.color,
            icon_background:this.layer.icon_background,
            icon_color:this.layer.icon_color,
            icon:parameters.icon,
            name:(this.layer.name+'_'+parameters.customStyle.name).replace(/[^a-zA-Z ]/g, "_")
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
   

    this.customStyles$ = this.selectedProvider.pipe(
      switchMap((provider: VectorProvider) => {
        return this.styleService.listCustomStylesOfGeometryType(provider.geometry_type).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while loading custom styles of provider "); return EMPTY }),
        )
      })
    )

   
    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next()
    }

    onAdd.pipe(
      tap(()=>{this.VectorProviderForm.disable()}),
      switchMap(() => {
        return this.mapsService.addProviderWithStyleToLayer(this.VectorProviderForm.value).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while saving provider"); this.VectorProviderForm.enable();return EMPTY }),
          tap(() => { this.VectorProviderForm.enable();this.dialogRef.close(true) })
        )
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  ngOnInit(): void {
  }

  displaySelectedVectorProvider(vectorProvider: VectorProvider): string {
    if (vectorProvider) {
      return vectorProvider.name
    }
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
