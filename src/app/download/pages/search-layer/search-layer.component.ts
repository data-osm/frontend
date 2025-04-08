import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatLegacyAutocomplete as MatAutocomplete, MatLegacyAutocompleteSelectedEvent as MatAutocompleteSelectedEvent } from '@angular/material/legacy-autocomplete';
import { EMPTY, Observable } from 'rxjs';
import { catchError, debounceTime, filter, map, switchMap } from 'rxjs/operators';
import { SearchLayerService } from '../../../data/services/search-layer.service';
import { Layer } from '../../../type/type';

@Component({
  selector: 'app-search-layer',
  templateUrl: './search-layer.component.html',
  styleUrls: ['./search-layer.component.scss']
})
/**
 * search layer for the donwload
 */
export class SearchLayerComponent implements OnInit {

  @Input() selected:UntypedFormControl

  formSearch:UntypedFormGroup = this.formBuilder.group({
    'searchWord':new UntypedFormControl(undefined,[Validators.required, Validators.minLength(2)])
  })
  resultSearchLayer$:Observable<ReadonlyArray<Layer>>

  constructor(
    public formBuilder:UntypedFormBuilder,
    public searchLayerService:SearchLayerService
  ) { 
    
    this.resultSearchLayer$ = this.formSearch.get('searchWord').valueChanges.pipe(
      filter((searchWord)=>this.formSearch.valid && typeof searchWord ==='string'),
      debounceTime(500),
      switchMap(()=>{
        return this.searchLayerService.searchLayer(this.formSearch.get('searchWord').value).pipe(
          catchError(() => { return EMPTY })
        )
      })
    )
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes:SimpleChanges){
    if (changes.selected) {
      if (this.selected.valid && this.selected.value) {
        this.formSearch.get('searchWord').setValue(this.selected.value,{emitEvent:false} )
      }
    }
  }

   /**
   * Funtion use to display information of a selected option
   * @retun string
   */
    displayAutocompleFn(selected: Layer): string {
     if (this.selected && this.selected.valid && this.selected.value) {
       return this.selected.value.name
     }else if (selected){
       return selected.name
     }
     return undefined
    }

    /**
   * Funtion call when user select an option
   * @param selected MatAutocompleteSelectedEvent
   */
  optionAutocomplteSelected(selected: MatAutocompleteSelectedEvent) {
    if (selected.option.value) {
      this.selected.setValue(selected.option.value)
    }
  }

}
