import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, UntypedFormBuilder, FormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapsService } from '../../../../../data/services/maps.service';
import { Layer } from '../../../../../type/type';

@Component({
  selector: 'app-detail-layer',
  templateUrl: './detail-layer.component.html',
  styleUrls: ['./detail-layer.component.scss']
})
export class DetailLayerComponent implements OnInit {
  @Input()layer:Layer
  onInitInstance:()=>void
  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  
  constructor(
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public mapsService:MapsService,
  ) { 
    this.notifier = notifierService;
  
  }

  ngOnInit(): void {
  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
