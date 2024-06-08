import { R } from '@angular/cdk/keycodes';
import { Component, OnInit, Input, Inject, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectionList, MatSelectionListChange } from '@angular/material/list';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Map } from 'ol';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CartoHelper } from '../../../../../../helper/carto.helper';
import { MapsService } from '../../../../../data/services/maps.service';
import { DataOsmLayersServiceService } from '../../../../../services/data-som-layers-service/data-som-layers-service.service';
import { coucheInterface, Group, groupThematiqueInterface, Layer, SubGroup, SubGroupWithLayers } from '../../../../../type/type';

@Component({
  selector: 'app-list-group-thematique',
  templateUrl: './list-group-thematique.component.html',
  styleUrls: ['./list-group-thematique.component.scss']
})
/**
 * List contents of a group thematique
 */
export class ListGroupThematiqueComponent implements OnInit {
  public onInitInstance:()=>void

  subGroupList$: Observable<SubGroupWithLayers[]>

  groupSelectForm:FormControl = new FormControl()

  private readonly notifier: NotifierService;
  environment = environment

  @ViewChildren(MatSelectionList) set matSelectionLists (matSelectionLists:QueryList<MatSelectionList>){
    if (matSelectionLists) {
      matSelectionLists.map((matSelectionList)=>{
        matSelectionList.selectionChange.pipe(
          withLatestFrom(this.subGroupList$ ),
          tap((parameters)=>{
  
            let isOptionSelected:boolean = parameters[0].option.selected
            let layer:Layer = parameters[0].option.value
  
  
  
            if (isOptionSelected) {
              try {
                this.dataOsmLayersServiceService.addLayer(layer, this.parameters.map, this.parameters.selected_group)
              } catch (error) {
                parameters[0].option.toggle()
              }
            }else{
              try {
               this.dataOsmLayersServiceService.removeLayer(layer.layer_id, this.parameters.map)
              } catch (error) {
                parameters[0].option.toggle()
                
              }
            }
          })
        ).subscribe()
      })

    }
    
  }
  
  constructor(
    public fb:FormBuilder,
    public mapsService :MapsService,
    public translate: TranslateService,
    notifierService: NotifierService,
    public dialogRef: MatDialogRef<ListGroupThematiqueComponent>,
    public dataOsmLayersServiceService : DataOsmLayersServiceService,
    @Inject(MAT_DIALOG_DATA) public parameters: {selected_group:Group, map:Map, groups:Array<Group>}
  ) {
    this.notifier = notifierService;
    this.groupSelectForm.setValue(this.parameters.selected_group)
    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    this.subGroupList$ =
    merge(
      this.groupSelectForm.valueChanges.pipe(startWith(this.groupSelectForm.value))
    ).pipe(
      switchMap((group)=>{
        return this.mapsService.getAllSubGroupWithLayersOfGroup(group.group_id).pipe(
          catchError(() => { this.notifier.notify("error", "An error occured while loading sub groups"); return EMPTY }),
        )
      }),
      shareReplay(1),
    )

   }


  ngOnInit(): void {
    this.onInitInstance()
  }


}
