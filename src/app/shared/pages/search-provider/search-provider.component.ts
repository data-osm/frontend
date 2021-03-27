import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { EMPTY, Observable, of } from 'rxjs';
import { filter, catchError, switchMap } from 'rxjs/operators';
import { VectorProviderService } from '../../../admin/administration/service/vector-provider.service';
import { VectorProvider } from '../../../type/type';

@Component({
  selector: 'app-search-provider',
  templateUrl: './search-provider.component.html',
  styleUrls: ['./search-provider.component.scss']
})
export class SearchProviderComponent implements OnInit {

  searchtVectorProviderForm: FormGroup = this.fb.group({})
  searchResultVectorProvider: Observable<VectorProvider[]>

  @Input()selectedProvider:FormControl = new FormControl(null)

  constructor(
    public vectorProviderService: VectorProviderService,
    public fb: FormBuilder,
  ) { 
    let searchControl = new FormControl(null, Validators.min(3))

    this.searchResultVectorProvider = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' && search_word.length > 2),
      catchError((err) => of([])),
      switchMap((search_word: string) => {
        return this.vectorProviderService.searchVectorProvider(search_word).pipe(
          catchError((error:HttpErrorResponse) => { 
            return EMPTY 
          }),
        )
      })
    )

    this.searchtVectorProviderForm.addControl('search_word', searchControl)
    
  }

  ngOnInit(): void {
  }

  displaySelectedVectorProvider(vectorProvider: VectorProvider): string {
    if (vectorProvider) {
      return vectorProvider.name
    }
  }

}
