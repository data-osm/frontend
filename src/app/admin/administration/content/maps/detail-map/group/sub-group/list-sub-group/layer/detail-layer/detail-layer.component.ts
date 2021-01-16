import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Layer } from '../../../../../../../../../../type/type';
import {MapsService} from '../../../../../../../../service/maps.service'

@Component({
  selector: 'app-detail-layer',
  templateUrl: './detail-layer.component.html',
  styleUrls: ['./detail-layer.component.scss']
})
export class DetailLayerComponent implements OnInit {
  @Input()layer_id:number
  onInitInstance:()=>void
  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  layer:Observable<Layer>
  
  constructor(
    // public dialogRef: MatDialogRef<DetailLayerComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService,
    // @Inject(MAT_DIALOG_DATA) public layer_id: number,
  ) { 
    this.notifier = notifierService;
    const onInit:ReplaySubject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    this.layer = merge(
      onInit.pipe(
        filter(()=>this.layer_id != undefined),
        switchMap(()=>{
          return this.MapsService.getLayer(this.layer_id).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading layer "); return EMPTY }),
          )
        })
      )
    )
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  close(): void {
    // this.dialogRef.close(false);
  }

}
