import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/internal/operators/catchError';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { manageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { VectorProvider } from '../../../../../type/type';
import { VectorProviderService } from '../../../service/vector-provider.service'
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';

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
  /**
   * list of the table colum that can be displayed
   */
  displayedColumns: string[] = ['name','state','detail'];
  /**
   * the datasource of the table that list vector provider
   */
  dataSource: MatTableDataSource<VectorProvider> = new MatTableDataSource<VectorProvider>([]);

  @ViewChild(MatPaginator) paginator: MatPaginator;
 
  searchtVectorProviderForm:FormGroup = this.fb.group({})
  searchResultVectorProvider:Observable<VectorProvider[]> 

  constructor(
    public VectorProviderService:VectorProviderService,
    public manageCompHelper:manageCompHelper,
    notifierService: NotifierService,
    public fb: FormBuilder,
  ) { 
    this.notifier = notifierService;
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.VectorProviderService.vectorProviderList.pipe()
    .subscribe(
      (response:VectorProvider[])=>{
        if (response) {
          // console.log(response)
          // this.dataSource = new MatTableDataSource(response)
          this.dataSource.data = response
          this.dataSource.paginator = this.paginator;
        }
      }
    )
    this.initilialiseSearchIcon()
  }

  initilialiseSearchIcon() {
    let searchControl = new FormControl(null, Validators.min(3))

    this.searchResultVectorProvider = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' &&  search_word.length > 2),
      catchError((err) => of([]) ),
      switchMap((search_word) => {
        return this.VectorProviderService.searchVectorProvider(search_word)
      })
    )
     
    this.searchtVectorProviderForm.addControl('search_word', searchControl)

  }

  displaySelectedIcon(vectorProvider:VectorProvider):string{
    if (vectorProvider) {
      return vectorProvider.name
    }
  }



  /**
   * Open modal to add a vector provider
   */
  openModalToAddVectorProvider(){
    this.manageCompHelper.openModalAddVectorProvider([],(response:boolean)=>{

    })
  }

}
