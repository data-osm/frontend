import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { VectorProvider } from '../../../type/type';
import { NotifierService } from 'angular-notifier';
import { OsmDataRequest } from '../../../services/request';

@Injectable({
  providedIn: 'root'
})
/**
 * service to handle vector provider: add, delete, edit etc...
 */
export class VectorProviderService extends OsmDataRequest {

  private readonly notifier: NotifierService;
  /**
   * list of icons, group by category
   */
  // public vectorProviderList: BehaviorSubject<VectorProvider[]> = new BehaviorSubject(undefined)

  // public vectorProviderListLoadError: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(
    private http_: HttpClient,
    notifierService: NotifierService,
  ) {
    super(http_)
    this.notifier = notifierService;

  }

  /**
   * fecth all list vector provider from backend and store it in observable vectorProviderList
   * If error emit boolean value on observable vectorProviderListLoadError
   */
  fetchAndStoreListVectorProvider(sort: string) {
    return this.safeGet<VectorProvider[]>('/api/provider/vector?' + sort)

  }

  /**
   * add  icon
   * @param group 
   * @returns Observable<VectorProvider>
   */
  addVectorProvider(vectorProvicer: VectorProvider): Observable<VectorProvider> {

    return this.safePost<VectorProvider>('/api/provider/vector', vectorProvicer,)
  }

  /**
   * Search an vector provider
   * @param search_word string
   */
  searchVectorProvider(search_word: string): Observable<VectorProvider[]> {
    // { reportProgress: true, observe: 'events' }
    return this.safeGet('/api/provider/vector/search?search=' + search_word).pipe(
      map((value: HttpResponse<any>): VectorProvider[] => { return value.body })
    )
  }

  /**
   * delete vector providers
   * @param provider_vector_ids Array<number>
   * @returns Observable<HttpResponse<any>>
   */
  deleteVectorProvider(provider_vector_ids: Array<number>): Observable<HttpResponse<any>> {
    const options = {
      headers: this.get_header(),
      body: {
        provider_vector_ids: provider_vector_ids,
      },
    };

    return this.safeDelete<HttpResponse<any>>('/api/provider/vector', {
      provider_vector_ids: provider_vector_ids,
    })

  }


  /**
   * update vector providers
   * @param provider_vector_ids Vec
   * @returns Observable<HttpResponse<any>>
   */
  updateVectorProvider(provider: VectorProvider): Observable<VectorProvider> {
    return this.safePut<VectorProvider>('/api/provider/vector/' + provider.provider_vector_id, provider)
  }

  /**
   * get a vector providor by provider_vector_id
   * @param id number 
   * @returns Observable<VectorProvider|HttpErrorResponse>
   */
  getVectorProvider(id: number): Observable<VectorProvider> {
    return this.safeGet<VectorProvider>('/api/provider/vector/' + id)
  }








}
