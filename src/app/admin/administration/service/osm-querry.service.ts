import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { VectorProvider, OsmQuerry, Querry } from '../../../type/type';
import { NotifierService } from 'angular-notifier';

@Injectable({
  providedIn: 'root'
})
/**
 * service to retrive, update, add and delete an osm querry
 */
export class OsmQuerryService {
  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend
  private readonly notifier: NotifierService;

  constructor(
    private http: HttpClient,
    notifierService: NotifierService,

  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.notifier = notifierService;

  }

  /**
   * Get all connections of the  app
   * @returns Observable<Array<string>>
   */
  listConnections():Observable<Array<string>>{
    return this.http.get<Array<string>>(this.url_prefix + '/api/datasource/connections',{ headers: this.get_header() })
  }

   /**
   * add  Osm Querry
   * @param osmQuerry OsmQuerry
   */
  addOsmQuerry(osmQuerry: OsmQuerry) {
      return this.http.post(this.url_prefix + '/api/datasource/osm', osmQuerry, {
        headers: this.get_header(), 
      })
  }

  /**
   * add  Osm Querry
   * @param osmQuerry OsmQuerry
   */
  updateOsmQuerry(osmQuerry: OsmQuerry) {
      return this.http.put(this.url_prefix + '/api/datasource/osm/'+osmQuerry.provider_vector_id, osmQuerry, {
        headers: this.get_header(), 
      })
  }

  /**
   * add   Querry
   * @param querry Querry
   */
   addQuerry(querry: Querry) {
    return this.http.post(this.url_prefix + '/api/datasource/querry', querry, {
      headers: this.get_header(), 
    })
  }

   /**
   * add   Querry
   * @param querry Querry
   */
    updateQuerry(querry: Querry) {
      return this.http.put(this.url_prefix + '/api/datasource/querry/'+querry.provider_vector_id, querry, {
        headers: this.get_header(), 
      })
  }

   /**
   * get a  querry by vector_provider_id
   * @param id number 
   * @returns Observable<Querry|HttpErrorResponse>
   */
   getQuerry(id:number):Observable<Querry>{
      return this.http.get<Querry>(this.url_prefix +'/api/datasource/querry/'+id,{ headers: this.get_header() })
    }

   /**
   * get a osm querry by osm_vector_provider_id
   * @param id number 
   * @returns Observable<OsmQuerry|HttpErrorResponse>
   */
  getOsmQuerry(id:number):Observable<OsmQuerry>{
 
    return this.http.get<OsmQuerry>(this.url_prefix +'/api/datasource/osm/'+id,{ headers: this.get_header() })
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
