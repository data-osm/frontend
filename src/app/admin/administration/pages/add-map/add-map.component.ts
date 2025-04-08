import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { AddVectorProviderComponent } from '../../../modules/provider/pages/add-vector-provider/add-vector-provider.component';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../data/services/maps.service';
@Component({
  selector: 'app-add-map',
  templateUrl: './add-map.component.html',
  styleUrls: ['./add-map.component.scss']
})
export class AddMapComponent implements OnInit, OnDestroy {
  
  onAddInstance:()=>void
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddVectorProviderComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService
  ) { 
    this.notifier = notifierService;
    this.form.addControl('name',new UntypedFormControl(null, [Validators.required]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    onAdd.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid),
      switchMap(()=>{
        return this.mapsService.addMap(this.form.value).pipe(
            catchError( (err)=> { this.notifier.notify("error", "An error occured when adding the map");return EMPTY } ),
            tap(_=> this.dialogRef.close(true))
        )
      })
    ).subscribe()
  }

  ngOnInit():void{
    
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
