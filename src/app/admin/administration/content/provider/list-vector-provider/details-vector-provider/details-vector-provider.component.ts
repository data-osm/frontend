import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { VectorProviderService } from '../../../../service/vector-provider.service'
import { manageCompHelper } from '../../../../../../../helper/manage-comp.helper'
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { VectorProvider } from '../../../../../../type/type';
import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-details-vector-provider',
  templateUrl: './details-vector-provider.component.html',
  styleUrls: ['./details-vector-provider.component.scss']
})
export class DetailsVectorProviderComponent implements OnInit {
  
  onInitInstance: () => void;
  private readonly notifier: NotifierService;

  vectorProvider:Observable<VectorProvider>

  constructor(
    public VectorProviderService:VectorProviderService,
    public manageCompHelper:manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) { 
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
    }

    this.vectorProvider = onInit.pipe(
      switchMap(()=>{
        return  this.VectorProviderService.getVectorProvider(Number(this.route.snapshot.paramMap.get('id') )).pipe(
          catchError(()=>{
            this.router.navigate(['/admin/vector-provider']);
            return EMPTY
          }),
        )
      }),
      shareReplay(1)
    )
   
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  /**
   * reload vector provider
   */
  reloadVectorProvider(){
    this.onInitInstance()
  }

}
