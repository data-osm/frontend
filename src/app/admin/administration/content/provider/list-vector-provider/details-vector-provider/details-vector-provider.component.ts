import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { VectorProviderService } from '../../../../service/vector-provider.service'
import { manageCompHelper } from '../../../../../../../helper/manage-comp.helper'
import { map, switchMap } from 'rxjs/operators';
import { VectorProvider } from '../../../../../../type/type';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-details-vector-provider',
  templateUrl: './details-vector-provider.component.html',
  styleUrls: ['./details-vector-provider.component.scss']
})
export class DetailsVectorProviderComponent implements OnInit {

  private readonly notifier: NotifierService;

  vectorProvider:VectorProvider

  constructor(
    public VectorProviderService:VectorProviderService,
    public manageCompHelper:manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    // console.log(this.route.snapshot.paramMap.get('id') )
    // this.vectorProvider.pipe().subscribe((val)=>{console.log(val)})

     this.VectorProviderService.getVectorProvider(Number(this.route.snapshot.paramMap.get('id') )).pipe(
      map((value)=> value)
    ).subscribe(
      (val)=>{
        console.log(val)
        if ( val instanceof HttpErrorResponse ) {
          if (val.status == 404) {
            this.notifier.notify("error", " Cannot find vector provider");
          }else{
            this.notifier.notify("error", "An error occured while loading vector provider");
          }
          this.router.navigate(['/admin/vector-provider']);
        }else{
          this.vectorProvider =val
        }
      
      }
    );
  }

}
