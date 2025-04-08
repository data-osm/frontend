import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../data/services/maps.service';
import { Map } from '../../../../type/type';

@Component({
  selector: 'app-edit-map',
  templateUrl: './edit-map.component.html',
  styleUrls: ['./edit-map.component.scss']
})
export class EditMapComponent implements OnInit {

  onUpdateInstance:()=>void
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<EditMapComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
    @Inject(MAT_DIALOG_DATA) public map: Map,
  ) { 
    this.notifier = notifierService;
    
    this.form.addControl('name',new UntypedFormControl(this.map.name, [Validators.required]))
    this.form.addControl('map_id',new UntypedFormControl(this.map.map_id, [Validators.required]))

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = () =>{
      onUpdate.next();
    }

    onUpdate.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid),
      switchMap(()=>{
        return this.mapsService.updateMap(this.form.value).pipe(
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
