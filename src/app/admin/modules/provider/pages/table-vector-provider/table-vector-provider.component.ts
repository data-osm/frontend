import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Observable, of, ReplaySubject, Subject, combineLatest, BehaviorSubject, Subscription } from 'rxjs';
import { switchMap, takeUntil, tap , } from 'rxjs/operators';
import { VectorProvider } from '../../../../../type/type';

@Component({
  selector: 'app-table-vector-provider',
  templateUrl: './table-vector-provider.component.html',
  styleUrls: ['./table-vector-provider.component.scss']
})
export class TableVectorProviderComponent implements OnInit, OnDestroy {
  
  onInitInstance: () => void;
  ngOnDestroyInstance: () => void;


  /**
   * List of provider_vector_id choose by the user
   */
  listOfChoosenVectorProvider:BehaviorSubject<number[]> = new BehaviorSubject([])
  
    /**
   * list of the table colum that can be displayed
   */
  displayedColumns: string[] = ['choose','name','geometry_type','state','created_at','updated_at','detail'];
  
  @Input() data:Observable<VectorProvider[]>;
  @Output() deleteVectorProvider: EventEmitter<number[]> = new EventEmitter<number[]>()
    /**
  * Emit when user change the sort of the table 
  */
  @Output() onSortChangeInstance: EventEmitter<Sort> = new EventEmitter<Sort>()

  dataValue: Observable<VectorProvider[]>;
  
  dataSource:Observable <VectorProvider[]> =  of([]);
  public destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  sortSubscription:Subscription
  @ViewChild(MatSort) set asd(sort: MatSort) {
    if (this.sortSubscription) {
      this.sortSubscription.unsubscribe()
    }
   this.sortSubscription = sort.sortChange.pipe(
      takeUntil(this.destroyed$),
      tap((e: Sort) => {
        this.onSortChangeInstance.emit(sort)
      })
    ).subscribe()
    
  };
  
  constructor() { 
    

    const onInit: Subject<void> = new ReplaySubject<void>(1);
    this.onInitInstance = () => {
      onInit.next();
      onInit.complete();
    }

    const destruction: Subject<void> = new Subject<void>();
    this.ngOnDestroyInstance = () => {
      destruction.next();
      destruction.complete();
    }

    this.dataValue = onInit.pipe(
      switchMap(() => {
         return this.data ?? of([]);
      }),
      tap(()=> this.listOfChoosenVectorProvider.next([]))
    );

  }

  ngOnInit(): void {
    this.onInitInstance();
  }

  ngOnDestroy() : void {
    this.ngOnDestroyInstance();
    this.destroyed$.complete()
  }

  /**
   * is vector provider choose by the user
   * @param provider_vector_id number
   * @return boolean
   */
  isVectorProviderChoose(provider_vector_id:number):boolean{
    return this.listOfChoosenVectorProvider.getValue().indexOf(provider_vector_id) != -1
  }

  /**
   * choose or unchoose a vector provider
   * @param provider_vector_id number
   */
  chooseOrUnchooseVectorProvider(provider_vector_id:number){
    if (this.listOfChoosenVectorProvider.getValue().indexOf(provider_vector_id) == -1) {
      this.listOfChoosenVectorProvider.getValue().push(provider_vector_id)
    }else{
      this.listOfChoosenVectorProvider.getValue().splice(this.listOfChoosenVectorProvider.getValue().indexOf(provider_vector_id),1)
    }
  }

  delete(){
    this.deleteVectorProvider.emit(this.listOfChoosenVectorProvider.getValue())
  }

}
