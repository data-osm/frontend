import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ReadPropExpr } from '@angular/compiler';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { EMPTY, from, merge, Observable, of, pipe, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, finalize, isEmpty, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { OsmQuerry } from '../../../../../type/type';
import { OsmQuerryService } from '../../../../administration/service/osm-querry.service'

@Component({
  selector: 'app-osm-querry',
  templateUrl: './osm-querry.component.html',
  styleUrls: ['./osm-querry.component.scss']
})
/**
 * edit osm querry
 */
export class OsmQuerryComponent implements OnInit {

  onInitInstance:()=>void
  /**
   * update an osm querry
   */
  onUpdateInstance:()=>void
  /**
   * add an osm querry
   */
  onAddInstance:()=>void

  /**
   * is a osm querry exist for this vector provider ?
   */
  osmQuerryExist:boolean = false

  @Input()provider_vector_id:number
  /**
   * reload vector provider
   */
  @Output()reloadVectorProvider:EventEmitter<any> = new EventEmitter<any>()

  private readonly notifier: NotifierService;

  /**
   * current osm querry
   */
  osmQuerry:Observable<OsmQuerry>

  /**
   * form for the where querry
   */
  osmFormWhere:FormGroup = this.fb.group({})
  /**
   * form for the select querry
   */
  osmFormSelect:FormGroup = this.fb.group({})

  /**
   * handle state of the osm querry
   * Is the form activated in the UI ?
   */
  osmQuerryState:{
    where:{activated:boolean}
    select:{activated:boolean}
  } = {
    where:{activated:false},
    select:{activated:false}
  }

  constructor(
    public OsmQuerryService:OsmQuerryService,
    notifierService: NotifierService,
    public fb: FormBuilder,
  ) { 
    this.notifier = notifierService;

    const onInit:Subject<any> = new ReplaySubject<any>()
    this.onInitInstance = ()=>{
      onInit.next()
      onInit.complete()
    }

    const onAdd:Subject<any> = new Subject<any>()
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    const onUpdate:Subject<any> = new Subject<any>()
    this.onUpdateInstance = ()=>{
      onUpdate.next()
    }

    this.osmQuerry = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.OsmQuerryService.getOsmQuerry(this.provider_vector_id).pipe(
            catchError((value:HttpErrorResponse)=>{
              if (value.status != 404) {
                this.notifier.notify("error", "An error occured while loading osm querry")
              }
              this.initialiseFormQuerry({} as OsmQuerry)
              return EMPTY
            }),
            tap((osmQuerry:OsmQuerry)=>{
              this.osmQuerryExist = true
              this.initialiseFormQuerry(osmQuerry)
            })
          )
        })
      ),
      onAdd.pipe(
        filter(()=> this.osmFormWhere.valid),
        tap(()=>{
          this.osmFormSelect.disable()
          this.osmFormWhere.disable()
        }),
        switchMap(()=>{
          let data = {
            where:this.osmFormWhere.get('where').value,
            select:this.osmFormSelect.get('select').value,
            provider_vector_id:this.provider_vector_id
          }
          return this.OsmQuerryService.addOsmQuerry(data).pipe(
            catchError( (err:HttpErrorResponse)=> {
              this.osmFormSelect.enable()
              this.osmFormWhere.enable()
               this.handleErrorOnSavingQuerry(err);
              return EMPTY
              } ),
            switchMap(()=>{
              this.osmFormSelect.enable()
              this.osmFormWhere.enable()
              return this.OsmQuerryService.getOsmQuerry(this.provider_vector_id).pipe(
                catchError((value:HttpErrorResponse)=>{
                  if (value.status != 404) {
                    this.notifier.notify("error", "An error occured while loading osm querry")
                  }
                  return EMPTY
                }),
                tap((osmQuerry)=>{
                  this.osmQuerryExist = true;
                  this.reloadVectorProvider.emit()
                  this.handleSucessOnSavingQuerry(osmQuerry)
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        tap(()=>{
          this.osmFormSelect.disable()
          this.osmFormWhere.disable()
        }),
        switchMap(()=>{
          let data = {
            where:this.osmFormWhere.get('where').value,
            select:this.osmFormSelect.get('select').value,
            provider_vector_id:this.provider_vector_id
          }
          return this.OsmQuerryService.updateOsmQuerry(data).pipe(
            catchError( (err:HttpErrorResponse)=> {
              this.osmFormSelect.enable()
              this.osmFormWhere.enable()
              this.handleErrorOnSavingQuerry(err); 
              return EMPTY
            }),
            switchMap(()=>{
              this.osmFormSelect.enable()
              this.osmFormWhere.enable()
              return this.OsmQuerryService.getOsmQuerry(this.provider_vector_id).pipe(
                catchError((value:HttpErrorResponse)=>{
                  if (value.status != 404) {
                    this.notifier.notify("error", "An error occured while loading osm querry")
                  }
                  return EMPTY
                }),
                tap((osmQuerry)=>{this.osmQuerryExist = true;this.reloadVectorProvider.emit();this.handleSucessOnSavingQuerry(osmQuerry)})
              )
            })
          )
        })
      )
    ).pipe(
      shareReplay(1),
    )

  }

   ngOnInit() {
    this.onInitInstance()
  }


  /**
   * Activate or desactivate an osm Form 
   * @param querryType 
   */
  toggleStateOSMQuerry(querryType:'where'|'select'){
    this.osmQuerryState[querryType].activated = !this.osmQuerryState[querryType].activated 
  }

  submitForms(){
    if (this.osmQuerryExist) {
     this.onUpdateInstance()
    }else{
      this.onAddInstance()
    }
  }

    /**
   * initialise osm querry form
   */
  initialiseFormQuerry(osmQuerry:OsmQuerry){
    this.osmFormWhere.addControl('where',new FormControl( osmQuerry.where?osmQuerry.where:null, [Validators.required]))
    this.osmFormSelect.addControl('select',new FormControl(osmQuerry.select?osmQuerry.select:null))
  }

  /**
   * When error occur while updating or adding an osm querry
   * @param err HttpErrorResponse
   */
  handleErrorOnSavingQuerry(err:HttpErrorResponse){
    this.notifier.notify("error", "An unexpected error occured when saving the osm querry");
    if (err.status == 400 && err.error.error ) {
      setTimeout(() => {
        alert(err.error.msg)
      }, 500);
    }
  }

  /**
   * When saving or updating and osm querry succed
   */
  handleSucessOnSavingQuerry(osmQuerry:OsmQuerry){
  
    this.osmQuerryState = {
      where:{activated:false},
      select:{activated:false}
    }
    this.clearFormGroup(this.osmFormWhere)
    this.clearFormGroup(this.osmFormSelect)
    this.initialiseFormQuerry(osmQuerry)
  }

  /**
   * Clear form grpup
   * @param form FormGroup
   */
  clearFormGroup(form:FormGroup){
    for (const key in form.controls) {
      if (Object.prototype.hasOwnProperty.call(form.controls, key)) {
        const element = form.controls[key];
        form.removeControl(key)
      }
    }
  }


}
