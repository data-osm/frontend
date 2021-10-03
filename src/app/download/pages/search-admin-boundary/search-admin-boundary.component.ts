import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { EMPTY, Observable } from 'rxjs';
import { catchError, debounceTime, filter, map, switchMap } from 'rxjs/operators';
import { AdminBoundaryRespone } from '../../../data/models/parameters';
import { ParametersService } from '../../../data/services/parameters.service';
import { SearchLayerService } from '../../../data/services/search-layer.service';

@Component({
  selector: 'app-search-admin-boundary',
  templateUrl: './search-admin-boundary.component.html',
  styleUrls: ['./search-admin-boundary.component.scss']
})
export class SearchAdminBoundaryComponent implements OnInit {

  @Input() selected:FormControl

  formSearch:FormGroup = this.formBuilder.group({
    'searchWord':new FormControl(undefined,[Validators.required, Validators.minLength(2)])
  })
  resultSearchAdminBoundary$:Observable<ReadonlyArray<AdminBoundaryRespone>>

  constructor(
    public formBuilder:FormBuilder,
    public parametersService:ParametersService
  ) { 
    
    this.resultSearchAdminBoundary$ = this.formSearch.get('searchWord').valueChanges.pipe(
      filter((searchWord)=>this.formSearch.valid && typeof searchWord ==='string' ),
      debounceTime(500),
      switchMap(()=>{
        return this.parametersService.searchAdminBoundary(this.formSearch.get('searchWord').value).pipe(
          catchError((_err) => { return EMPTY })
          )
      })
    )
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes:SimpleChanges){
    if (changes.selected) {
      if (this.selected.valid && this.selected.value) {
        this.selected.setValue(this.selected.value)
      }
    }
  }

   /**
   * Funtion use to display information of a selected option
   * @retun string
   */
    displayAutocompleFn(selected: AdminBoundaryRespone): string {
     if (this.selected && this.selected.valid && this.selected.value) {
       return this.selected.value.feature.name
     }else if (selected){
      return selected.feature.name
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
