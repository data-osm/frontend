import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, merge, EMPTY, of } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MapsService } from '../../../../../../data/services/maps.service';
import { Style } from '../../../../../../ol-module';
import { VectorProvider, Layer } from '../../../../../../type/type';
import { StyleService } from '../../../../../administration/service/style.service';
import { VectorProviderService } from '../../../../../administration/service/vector-provider.service';

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

  private readonly notifier: NotifierService;
  displayedColumns: string[] = ['option', 'provider', 'style'];

  searchtVectorProviderForm: FormGroup = this.fb.group({})
  searchResultVectorProvider: Observable<VectorProvider[]>

  selectedProvider: Subject<VectorProvider> = new ReplaySubject<VectorProvider>(1)
  selectedProviderStyle: Observable<Style[]>

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  VectorProviderForm: FormGroup

  constructor(
    public vectorProviderService: VectorProviderService,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public translate: TranslateService,
    public styleService: StyleService,
    public mapsService: MapsService,
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
        return this.vectorProviderService.searchVectorProvider(search_word)
      })
    )

    this.searchtVectorProviderForm.addControl('search_word', searchControl)


    this.selectedProviderStyle = this.selectedProvider.pipe(
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
