import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, EMPTY, iif, Observable, ReplaySubject } from 'rxjs';
import { catchError, filter, mergeMap, map, takeUntil, tap, startWith } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';
import { Tag, TagsIcon } from '../../../../../type/type';
import {IconService} from '../../../../administration/service/icon.service'

@Component({
  selector: 'app-update-tags',
  templateUrl: './update-tags.component.html',
  styleUrls: ['./update-tags.component.scss']
})
export class UpdateTagsComponent implements OnInit {

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  choosenTags:BehaviorSubject<Array<string>> = new BehaviorSubject([])
  filteredTags:Observable<Tag[]|TagsIcon[]>
  tags_temp = new FormControl(null)

  @Input() tagsForm:FormControl
  @Input() type:'icons'|'layer'

  @ViewChild('tagInput') tagInput: ElementRef;
  
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private readonly notifier: NotifierService;

  constructor(
    notifierService: NotifierService,
    public IconService:IconService,
    public mapsService:MapsService,
  ) { 
    this.notifier = notifierService;

    this.filteredTags = this.tags_temp.valueChanges.pipe(
      filter(search_word => search_word && typeof search_word ==='string' && search_word.length >2 ),

      mergeMap(search_word => iif(() => this.type =='icons',
      
      this.IconService.searchIconTags(search_word).pipe(
        catchError((error:HttpErrorResponse) => { 
          this.notifier.notify("error", "An error occured while searching for tags");
          return EMPTY 
        }),
      )

      ,
      
      this.mapsService.searchTags(search_word) ).pipe(
        catchError((error:HttpErrorResponse) => { 
          this.notifier.notify("error", "An error occured while searching for tags");
          return EMPTY 
        }),
       )

      ),
    
    )
  }

  ngOnInit(): void {
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ngAfterViewInit(){
     
    this.tagsForm.valueChanges.pipe(
      startWith(this.tagsForm.value),
      takeUntil(this.destroyed$),
      filter((value)=> value && value != ''),
      tap((value)=>{
        console.log(value)
        let initialTag = value.map((tag)=>{return tag  } )
        if (initialTag.length > 0) {
          this.choosenTags.next(initialTag)
        }
      })
    ).subscribe()

    this.choosenTags.pipe(
      tap((value)=>{
        console.log('shipperr')
        this.tagsForm.setValue( value.map((tag)=>{return tag } ) , {emitEvent:false})
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our tag
    if ((value || '').trim()) {
      let newChoosenTags = this.choosenTags.getValue()
      newChoosenTags.push(value.trim())
      this.choosenTags.next(newChoosenTags);
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.tags_temp.setValue(null);
  }

  remove(fruit: string): void {
    let newChoosenTags = this.choosenTags.getValue()
    const index = newChoosenTags.indexOf(fruit);

    if (index >= 0) {
      newChoosenTags.splice(index, 1);
      this.choosenTags.next(newChoosenTags);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    let newChoosenTags = this.choosenTags.getValue()
    newChoosenTags.push(event.option.viewValue);
    this.choosenTags.next(newChoosenTags);
    this.tagInput.nativeElement.value = '';
    this.tags_temp.setValue(null);
  }

}
