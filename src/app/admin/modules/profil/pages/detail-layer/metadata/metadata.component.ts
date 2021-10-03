import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import { Meta } from '@angular/platform-browser';
import { MapsService } from '../../../../../../data/services/maps.service';
import { Metadata, Tag, Layer } from '../../../../../../type/type';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss']
})
/**
 * Layer metadata
 */
export class MetadataComponent implements OnInit {

  @Input()layer:Layer

  onInitInstance:()=>void
  onAddInstance:()=>void
  onUpdateInstance:()=>void

  metadata:Observable<Metadata>

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = false;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  choosenTags:Array<string> = []
  filteredTags:Observable<Tag[]>
  metadataForm:FormGroup

  @ViewChild('tagInput') tagInput: ElementRef;

  
  private readonly notifier: NotifierService;

  constructor(
    notifierService: NotifierService,
    public mapsService:MapsService,
    public dialog: MatDialog,
    public translate: TranslateService,
    public fb:FormBuilder
  ) { 

    this.notifier = notifierService;

    this.metadataForm = this.fb.group({
      layer:new FormControl(null,[Validators.required]),
      description:new FormControl(null,[Validators.required]),
      tags_temp:new FormControl(null),
      id:new FormControl(null),
    })

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = ()=>{
      onUpdate.next()
    }

    this.filteredTags = this.metadataForm.get('tags_temp').valueChanges.pipe(
      filter(search_word => search_word && typeof search_word ==='string' && search_word.length >2 ),
      switchMap((search_word:string)=>{
        return this.mapsService.searchTags(search_word).pipe(
          catchError((error:HttpErrorResponse) => { 
            this.notifier.notify("error", "An error occured while searching for tags");
            return EMPTY 
          }),
        )
      })
    )

    this.metadata = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.mapsService.getLayerMetadata(this.layer.layer_id).pipe(
            catchError((error:HttpErrorResponse) => { 
              if (error.status != 404) {
                this.notifier.notify("error", "An error occured while loading metadata ");
              }else{
                // this.notifier.notify("error", " This layer does'nt have a metadata yet ! ");
              }
              return EMPTY 
            }),
            tap((metadata)=>{
              this.metadataForm.get('description').setValue(metadata.description)
              this.metadataForm.get('id').setValue(metadata.id)
              this.metadataForm.get('id').setValidators([Validators.required])
              metadata.tags.map((tag)=>{
                this.choosenTags.push(tag.name)
              })
            })
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          let metadata = {
            layer: this.metadataForm.get('layer').value,
            description: this.metadataForm.get('description').value,
            tags: this.choosenTags.map((tag)=>{return {name:tag,id:null} } ),
          }
          return this.mapsService.addMetadata(metadata).pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while adding the metadata");
              return EMPTY 
            }),
            switchMap(()=>{
              return this.mapsService.getLayerMetadata(this.layer.layer_id).pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while loading metadata ");
                  return EMPTY 
                }),
                tap((metadata)=>{
                  this.notifier.notify("succes", "The metadata was succesfully added");
                  this.metadataForm.get('description').setValue(metadata.description)
                  this.metadataForm.get('id').setValue(metadata.id)
                  this.metadataForm.get('id').setValidators([Validators.required])
                  this.choosenTags = []
                  metadata.tags.map((tag)=>{
                    this.choosenTags.push(tag.name)
                  })
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap(()=>{

          let metadata = {
            layer: this.metadataForm.get('layer').value,
            description: this.metadataForm.get('description').value,
            tags: this.choosenTags.map((tag)=>{return {name:tag,id:undefined}}),
            id:this.metadataForm.get('id').value
          }

          return this.mapsService.updateMetadata(metadata).pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while adding the metadata");
              return EMPTY 
            }),
            switchMap(()=>{
              return this.mapsService.getLayerMetadata(this.layer.layer_id).pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while loading metadata ");
                  return EMPTY 
                }),
                tap((metadata)=>{
                  this.notifier.notify("succes", "The metadata was succesfully updated");
                  this.metadataForm.get('description').setValue(metadata.description)
                  this.metadataForm.get('id').setValue(metadata.id)
                  this.metadataForm.get('id').setValidators([Validators.required])
                  this.choosenTags = []
                  metadata.tags.map((tag)=>{
                    this.choosenTags.push(tag.name)
                  })
                })
              )
            })
          )
        })
      )
    ).pipe(
      shareReplay(1)
    )
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.layer.currentValue){
      this.metadataForm.get('layer').setValue(this.layer.layer_id)
      this.onInitInstance()
    }
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our tag
    if ((value || '').trim()) {
      this.choosenTags.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.metadataForm.get('tags_temp').setValue(null);
  }

  remove(fruit: string): void {
    const index = this.choosenTags.indexOf(fruit);

    if (index >= 0) {
      this.choosenTags.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.choosenTags.push(event.option.viewValue);
    this.tagInput.nativeElement.value = '';
    this.metadataForm.get('tags_temp').setValue(null);
  }
  
}
