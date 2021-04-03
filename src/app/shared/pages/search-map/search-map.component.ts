import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Observable, of, EMPTY } from 'rxjs';
import { filter, catchError, switchMap } from 'rxjs/operators';
import { MapsService } from '../../../admin/administration/service/maps.service';
import { Map } from '../../../type/type';

@Component({
  selector: 'app-search-map',
  templateUrl: './search-map.component.html',
  styleUrls: ['./search-map.component.scss']
})
export class SearchMapComponent implements OnInit, OnChanges {

  searchtMapForm: FormGroup = this.fb.group({})
  searchResultMap: Observable<Map[]>

  @Input()selectedMap:FormControl = new FormControl(null)

  constructor(
    public mapService: MapsService,
    public fb: FormBuilder,
  ) { 
    let searchControl = new FormControl(null, Validators.min(3))

    this.searchResultMap = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' && search_word.length > 2),
      catchError((err) => of([])),
      switchMap((search_word: string) => {
        return this.mapService.searchMap(search_word).pipe(
          catchError((error:HttpErrorResponse) => { 
            return EMPTY 
          }),
        )
      })
    )
    this.searchtMapForm.addControl('search_word', searchControl)
    
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedMap) {
      if (changes.selectedMap.currentValue.value) {
        this.searchtMapForm.get('search_word').setValue(this.selectedMap.value,{emitEvent:false})
      }
    }
  }

  displaySelectedMap(map: Map): string {
    if (map) {
      return map.name
    }
  }

}
