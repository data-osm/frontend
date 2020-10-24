import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { from, of, pipe } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { OsmQuerry } from '../../../../../../../type/type';
import { OsmQuerryService } from '../../../../../service/osm-querry.service'

@Component({
  selector: 'app-osm-querry',
  templateUrl: './osm-querry.component.html',
  styleUrls: ['./osm-querry.component.scss']
})
/**
 * edit osm querry
 */
export class OsmQuerryComponent implements OnInit {

  @Input()provider_vector_id:number

  private readonly notifier: NotifierService;

  osmQuerry:OsmQuerry = {} as OsmQuerry

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
  }

   ngOnInit() {
    
    this.OsmQuerryService.getOsmQuerry(this.provider_vector_id).pipe(
      map((value)=> value)
    ).subscribe(
      (val)=>{
        if ( val instanceof HttpErrorResponse ) {
          if (val.status == 404) {
            
          }else{
            this.notifier.notify("error", "An error occured while loading vector provider");
          }
          
        }else{
          this.osmQuerry =val
        }
        this.initialiseFormQuerry()
      }
    );
  }



  /**
   * initialise osm querry form
   */
  initialiseFormQuerry(){
  
    this.osmFormWhere.addControl('where',new FormControl( this.osmQuerry.where?this.osmQuerry.where:null, [Validators.required]))
    this.osmFormSelect.addControl('select',new FormControl(this.osmQuerry.select?this.osmQuerry.select:null))
  }

  /**
   * Activate or desactivate an osm Form
   * @param querryType 
   */
  toggleStateOSMQuerry(querryType:'where'|'select'){
    this.osmQuerryState[querryType].activated = !this.osmQuerryState[querryType].activated 
  }

  submitForms(){
    if (this.osmQuerry.provider_vector_id) {
      this.updateOsmQuerry()
    }else{
      this.addOsmQuerry()
    }
  }

  addOsmQuerry(){
    if (this.osmFormWhere.valid) {

      this.osmFormSelect.disable()
      this.osmFormWhere.disable()
      let data = {
        where:this.osmFormWhere.get('where').value,
        select:this.osmFormSelect.get('select').value,
        provider_vector_id:this.provider_vector_id
      }

      this.OsmQuerryService.addOsmQuerry(data).pipe(
        map((value: OsmQuerry):OsmQuerry => { return value }),
        catchError( (err:HttpErrorResponse)=> of(err)),
      ).subscribe(
        (response)=>{
          if (response instanceof HttpErrorResponse) {
            this.handleErrorOnSavingQuerry(response)
          } else {
            this.handleSucessOnSavingQuerry(response)
          }
          this.osmFormSelect.enable()
          this.osmFormWhere.enable()
        },
        (err)=>{},
        ()=>{
          
        },
      )
      
    }
    
  }

  updateOsmQuerry(){
    let data = {
      where:this.osmFormWhere.get('where').value,
      select:this.osmFormSelect.get('select').value,
      provider_vector_id:this.provider_vector_id
    }
    this.OsmQuerryService.updateOsmQuerry(data).pipe(
      map((value: OsmQuerry):OsmQuerry => { return value }),
      catchError( (err:HttpErrorResponse)=> of(err)),
    ).subscribe(
      (response)=>{
        if (response instanceof HttpErrorResponse) {
          this.handleErrorOnSavingQuerry(response)
        } else {
          this.handleSucessOnSavingQuerry(response)
        }
        this.osmFormSelect.enable()
        this.osmFormWhere.enable()
      },
      (err)=>{
        
      },
      ()=>{
        
      },
    )
  }

  /**
   * When error occur while updating or adding an osm querry
   * @param err HttpErrorResponse
   */
  handleErrorOnSavingQuerry(err:HttpErrorResponse){
    if (err.status == 400 && err.error.error ) {
      this.notifier.notify("error", err.error.msg);
      setTimeout(() => {
        alert(err.error.description)
      }, 500);
    }else{
      this.notifier.notify("error", "An unexpected error occured when saving the osm querry");
    }
  }

  /**
   * When saving or updating and osm querry succed
   */
  handleSucessOnSavingQuerry(osmQuerry:OsmQuerry){
    this.osmQuerry = osmQuerry
    this.osmQuerryState = {
      where:{activated:false},
      select:{activated:false}
    }
    this.clearFormGroup(this.osmFormWhere)
    this.clearFormGroup(this.osmFormSelect)
    this.initialiseFormQuerry()
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
