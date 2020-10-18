import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse } from '@angular/common/http';
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
  public vectorProviderList: BehaviorSubject<VectorProvider[]> = new BehaviorSubject(undefined)

  public vectorProviderListLoadError: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(
    private http: HttpClient,
    notifierService: NotifierService,

  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.notifier = notifierService;

    this.fetchAndStoreListVectorProvider()
  }

  /**
   * fecth all list vector provider from backend and store it in observable vectorProviderList
   * If error emit boolean value on observable vectorProviderListLoadError
   */
  fetchAndStoreListVectorProvider(){
    this.vectorProviderList.next(undefined)
    from(this.getRequest('/api/provider/vector')).pipe(
      catchError((err) => { this.notifier.notify("error", "An error occured while loading vector provider"); throw new Error(err); }),
    ).subscribe(
      (response: VectorProvider[]) => {
        this.vectorProviderList.next(response)
        this.vectorProviderListLoadError.next(false)
      }, (error) => {
        this.vectorProviderListLoadError.next(true)
      }
    )
  }

  /**
   * add  icon
   * @param group 
   */
  addVectorProvider(vectorProvicer: VectorProvider) {
    // return from(this.http.post(this.url_prefix + '/api/provider/vector', vectorProvicer, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
    //   map((value: HttpResponse<any>):VectorProvider => { return value.body }),
    //   catchError((err) => { return err }),
    // ))

    return new Promise((resolve, reject) => {
      this.http.post(this.url_prefix + '/api/provider/vector', vectorProvicer, {
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

  /**
   * Search an vector provider
   * @param search_word string
   */
  searchVectorProvider(search_word:string):Observable<VectorProvider[]>{
    return from(this.http.post(this.url_prefix + '/api/provider/vector/search', {'search_word':search_word}, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>):VectorProvider[] => { return value.body })
    ))
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
