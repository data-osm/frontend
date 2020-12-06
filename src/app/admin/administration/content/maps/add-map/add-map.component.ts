import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { AddVectorProviderComponent } from '../../provider/add-vector-provider/add-vector-provider.component';
import {MapsService} from '../../../service/maps.service'
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
@Component({
  selector: 'app-add-map',
  templateUrl: './add-map.component.html',
  styleUrls: ['./add-map.component.scss']
})
export class AddMapComponent implements OnInit, OnDestroy {
  
  onAddInstance:()=>void
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);


  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddVectorProviderComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService
  ) { 
    this.notifier = notifierService;
    this.form.addControl('name',new FormControl(null, [Validators.required]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    onAdd.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid),
      switchMap(()=>{
        return this.MapsService.addMap(this.form.value).pipe(
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
