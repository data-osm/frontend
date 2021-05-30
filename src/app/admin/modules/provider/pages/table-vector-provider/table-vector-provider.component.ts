import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, of, ReplaySubject, Subject, combineLatest, BehaviorSubject } from 'rxjs';
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
  displayedColumns: string[] = ['choose','name','type_geometrie','state','detail'];
  
  @Input() data:Observable<VectorProvider[]>;
  @Output() deleteVectorProvider: EventEmitter<number[]> = new EventEmitter<number[]>()

  dataValue: Observable<VectorProvider[]>;
  
  dataSource:Observable <VectorProvider[]> =  of([]);

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
