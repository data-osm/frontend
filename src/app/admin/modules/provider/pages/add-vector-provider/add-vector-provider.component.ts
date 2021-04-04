import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { requiredFileType } from '../../../../../validators/upload-file-validators';
import {VectorProviderService} from '../../../../administration/service/vector-provider.service'
import { Observable, fromEvent,merge as observerMerge, forkJoin, concat, from } from 'rxjs';
import { HttpErrorResponse, HttpEvent, HttpResponse } from '@angular/common/http';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { VectorProvider } from '../../../../../type/type';

@Component({
  selector: 'app-add-vector-provider',
  templateUrl: './add-vector-provider.component.html',
  styleUrls: ['./add-vector-provider.component.scss']
})
/**
 * Add a vector provider with just his general information 
 */
export class AddVectorProviderComponent implements OnInit {

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddVectorProviderComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public VectorProviderService:VectorProviderService
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    this.initialiseVectorProviderForm()
  }

  close(): void {
    this.dialogRef.close(false);
  }

  /**
   * initialise form to add a vector provider 
   */
  initialiseVectorProviderForm(){
    this.form.addControl('name',new FormControl(null, [Validators.required]))
    this.form.addControl('geometry_type',new FormControl(null, [Validators.required]))
  }

  /**
   * Save vector provider
   */
  saveVectorProvider(){
    
    from(this.VectorProviderService.addVectorProvider(this.form.value)).pipe(
      tap(value => this.form.disable()),
      map((value: HttpResponse<any>):VectorProvider => value.body ),
      catchError( (err:HttpErrorResponse)=> { 
        this.notifier.notify("error", "An error occured when saving vector provider");

        if (err.status === 400) {
          alert(err.message)
        }
        throw new Error(err.message);
       }),
      finalize(()=>{
        this.form.enable();
      })
    ).subscribe(
      (response:VectorProvider)=>{
        this.notifier.notify("success", "Vector provider upload successfully")
        this.dialogRef.close(true);
      }
    )
  }

}
