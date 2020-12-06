import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import {MapsService} from '../../../service/maps.service'
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Map } from '../../../../../type/type';

@Component({
  selector: 'app-edit-map',
  templateUrl: './edit-map.component.html',
  styleUrls: ['./edit-map.component.scss']
})
export class EditMapComponent implements OnInit {

  onUpdateInstance:()=>void
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<EditMapComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService,
    @Inject(MAT_DIALOG_DATA) public map: Map,
  ) { 
    this.notifier = notifierService;
    
    this.form.addControl('name',new FormControl(this.map.name, [Validators.required]))
    this.form.addControl('map_id',new FormControl(this.map.map_id, [Validators.required]))

    const onUpdate:Subject<void> = new Subject<void>()
    this.onUpdateInstance = () =>{
      onUpdate.next();
    }

    onUpdate.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid),
      switchMap(()=>{
        return this.MapsService.updateMap(this.form.value).pipe(
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
