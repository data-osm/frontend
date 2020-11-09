import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { VectorProvider } from '../../../type/type';
import { NotifierService } from 'angular-notifier';

@Injectable({
  providedIn: 'root'
})
/**
 * service to handle vector provider: add, delete, edit etc...
 */
export class VectorProviderService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend
  private readonly notifier: NotifierService;
  /**
   * list of icons, group by category
   */
  // public vectorProviderList: BehaviorSubject<VectorProvider[]> = new BehaviorSubject(undefined)

  // public vectorProviderListLoadError: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(
    private http: HttpClient,
    notifierService: NotifierService,

  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.notifier = notifierService;

  }

  /**
   * fecth all list vector provider from backend and store it in observable vectorProviderList
   * If error emit boolean value on observable vectorProviderListLoadError
   */
  fetchAndStoreListVectorProvider(){
    return this.http.get<VectorProvider[]>(this.url_prefix +'/api/provider/vector',{ headers: this.get_header() })
  
  }

  /**
   * add  icon
   * @param group 
   * @returns Observable<HttpResponse<any>>
   */
  addVectorProvider(vectorProvicer: VectorProvider) {

    return this.http.post(this.url_prefix + '/api/provider/vector', vectorProvicer, {headers: this.get_header(), reportProgress: true,}).pipe(
      map((value:HttpResponse<any>) => value),
    )
  }

  /**
   * Search an vector provider
   * @param search_word string
   */
  searchVectorProvider(search_word:string):Observable<VectorProvider[]>{
    return this.http.post(this.url_prefix + '/api/provider/vector/search', {'search_word':search_word}, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>):VectorProvider[] => { return value.body })
    )
  }

  /**
   * delete vector providers
   * @param provider_vector_ids Array<number>
   * @returns Observable<HttpResponse<any>>
   */
  deleteVectorProvider(provider_vector_ids:Array<number>):Observable<HttpResponse<any>>{
    const options = {
      headers: this.get_header(),
      body: {
        provider_vector_ids: provider_vector_ids,
      },
    };

    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/provider/vector', options)
    // .pipe(
    //   map((value:HttpResponse<any>) => value),
    //   // catchError((err:HttpErrorResponse) => { throw err;})
    // )
  }

  /**
   * get a vector providor by provider_vector_id
   * @param id number 
   * @returns Observable<VectorProvider|HttpErrorResponse>
   */
  getVectorProvider(id:number):Observable<VectorProvider|HttpErrorResponse>{

    return this.http.get(this.url_prefix +'/api/provider/vector/'+id,{ headers: this.get_header() }).pipe(
      map((value: VectorProvider):VectorProvider => { return value }),
      catchError((err:HttpErrorResponse) => of(err) )
    )
  }


  /**
  * Get header
  * @returns HttpHeaders
  */
  get_header(): HttpHeaders {
    this.headers = this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }


  /**
* Make a get request to Backend
* @param string path url
*/
  getRequest(path: string): Promise<any> {
    let promise = new Promise((resolve, reject) => {
      this.http.get(this.url_prefix + path, { headers: this.get_header() })
        .toPromise()
        .then(
          res => {
            resolve(res);
          },
          msg => { // Error
            reject(msg);
          }
        );
    });

    return promise;
  }


  /**
   * Make a Post request to Backend
   * @param string path url
   * @param Object data
   */
  post_requete(url: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post(this.url_prefix + url, data, {
        headers: this.get_header(), reportProgress: true,
        observe: 'events'
      })
        .toPromise()
        .then(
          res => {
            resolve(res);
          },
          msg => { // Error

            reject(msg.error);
          }
        );
    });
  }

}
