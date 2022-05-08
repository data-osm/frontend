import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, EMPTY, merge, Observable, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/internal/operators/catchError';
import { filter, finalize, map, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { VectorProvider } from '../../../../../type/type';
import { VectorProviderService } from '../../../../administration/service/vector-provider.service'
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import { HttpResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AddVectorProviderComponent } from '../add-vector-provider/add-vector-provider.component';
import { Router } from '@angular/router';
import { Sort } from '@angular/material/sort';

@Component({
  selector: 'app-list-vector-provider',
  templateUrl: './list-vector-provider.component.html',
  styleUrls: ['./list-vector-provider.component.scss'],
})
/**
 * List and find all vector provider
 */
export class ListVectorProviderComponent implements OnInit {

  private readonly notifier: NotifierService;

  onInitInstance: () => void;
  onAddInstance: () => void;
  deleteVectorInstance:(ids:number[]) => void;

  /**
   * the datasource of the table that list vector provider
   */
  data:Observable<VectorProvider[]>
  // dataSource: Observable<MatTableDataSource<VectorProvider>> = of(new MatTableDataSource<VectorProvider>([]));

  /**
   * is comp interacting with backend ?
   */
  loading:boolean=true

  /**
   * paginator of the table of vector providor
   */
  @ViewChild(MatPaginator) paginator: MatPaginator;

   /**
  * Emit when user change the sort of the table 
  */
    onSortChangeInstance: (e: Sort) => void;
 
  searchtVectorProviderForm:FormGroup = this.fb.group({})
  searchResultVectorProvider:Observable<VectorProvider[]> 

  constructor(
    public VectorProviderService:VectorProviderService,
    public manageCompHelper:ManageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
    public translate: TranslateService,
    private router: Router,
    public dialog:MatDialog
  ) { 
    this.notifier = notifierService;

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
      onInit.complete();
    }

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    const onSortChange: Subject<Sort> = new Subject<Sort>()
    this.onSortChangeInstance = (e: Sort) => {
      onSortChange.next(e)
    }

    let searchControl = new FormControl(null, Validators.min(3))

    this.searchResultVectorProvider = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' &&  search_word.length > 2),
      catchError((err) => of([]) ),
      switchMap((search_word) => {
        return this.VectorProviderService.searchVectorProvider(search_word)
      })
    )
     
    this.searchtVectorProviderForm.addControl('search_word', searchControl)

    const onDelete :Subject<number[]> = new Subject<number[]>();
    this.deleteVectorInstance = (ids:number[])=>{
      onDelete.next(ids)
    }  

    this.data = merge(
      onInit,
      onSortChange,
      onDelete.pipe(
        switchMap((ids: number[]) => {
          return  this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.vector_provider.delete_confirmation_title'),
            confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation')+ ids.length +' ' +this.translate.instant('admin.vector_provider.delete_confirmation_explanation2') +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(() => {
              return this.VectorProviderService.deleteVectorProvider(ids).pipe(
                catchError(() => {
                  this.notifier.notify("error", "An error occured while deleting vector provider");
                  this.loading = false;
                  return EMPTY;
              })
              )
            })
            )
        })
      ),
      onAdd.pipe(
        
        switchMap(() => {
          let proprietes = {
            disableClose: false,
            minWidth: 400,
          }
      
         return  this.dialog.open(AddVectorProviderComponent, proprietes).afterClosed().pipe(
            filter((response:VectorProvider)=> response != undefined ),
            tap(() => this.loading = true)
          )
        })
      ),
    ).pipe(
      withLatestFrom(onSortChange.pipe(
        startWith({
        active: 'name',
        direction: 'asc'
      }))
      ),
      map((e)=>e[1]),
      switchMap((sort) => {
        let ordering = sort.direction == 'asc' ? '' : '-'
        return this.VectorProviderService.fetchAndStoreListVectorProvider('ordering=' + ordering + sort.active).pipe(
          tap(() => this.loading = false),
          catchError(()=>{this.notifier.notify("error", "An error occured while loading vector provider");return EMPTY})
        );
      }),
     shareReplay(1)
    );


  }

  ngAfterViewInit() {
    //this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.onInitInstance();
  }

  
  displaySelectedVectorProvider(vectorProvider:VectorProvider):string{
    if (vectorProvider) {
      return vectorProvider.name
    }
  }

}
