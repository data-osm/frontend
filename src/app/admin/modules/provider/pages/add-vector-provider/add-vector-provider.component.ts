import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { requiredFileType } from '../../../../../validators/upload-file-validators';
import {VectorProviderService} from '../../../../administration/service/vector-provider.service'
import { Observable, fromEvent,merge as observerMerge, forkJoin, concat, from } from 'rxjs';
import { HttpErrorResponse, HttpEvent, HttpResponse } from '@angular/common/http';
import { catchError, finalize, map, switchMap, take, tap } from 'rxjs/operators';
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

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddVectorProviderComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public VectorProviderService:VectorProviderService
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    this.initialiseVectorProviderForm()
  }

  close(): void {
    this.dialogRef.close();
  }

  /**
   * initialise form to add a vector provider 
   */
  initialiseVectorProviderForm(){
    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('geometry_type',new UntypedFormControl(null, []))
  }

  /**
   * Save vector provider
   */
  saveVectorProvider(){
    
    from(this.VectorProviderService.addVectorProvider(this.form.value)).pipe(
      tap(value => this.form.disable()),
      catchError( (err:HttpErrorResponse)=> { 
        this.notifier.notify("error", "An error occured when saving vector provider");

        if (err.status === 400) {
          alert(err.message)
        }
        throw new Error(err.message);
       }),
      tap((response)=>{
        this.form.enable();
        this.notifier.notify("success", "Vector provider upload successfully")
        this.dialogRef.close(response);
      }),
      take(1)
    ).subscribe()
  }

}
