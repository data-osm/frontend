import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { VectorProvider, OsmQuerry, Querry } from '../../../type/type';
import { NotifierService } from 'angular-notifier';
import { OsmDataRequest } from '../../../services/request';

@Injectable({
  providedIn: 'root'
})
/**
 * service to retrive, update, add and delete an osm querry
 */
export class OsmQuerryService extends OsmDataRequest {
  private readonly notifier: NotifierService;

  constructor(
    private http_: HttpClient,
    notifierService: NotifierService,

  ) {
    super(http_)
    this.notifier = notifierService;

  }

  /**
   * Get all connections of the  app
   * @returns Observable<Array<string>>
   */
  listConnections(): Observable<Array<string>> {
    return this.safeGet<Array<string>>('/api/datasource/connections')
  }

  /**
  * add  Osm Querry
  * @param osmQuerry OsmQuerry
  */
  addOsmQuerry(osmQuerry: OsmQuerry) {
    return this.safePost('/api/datasource/osm', osmQuerry)
  }

  /**
   * add  Osm Querry
   * @param osmQuerry OsmQuerry
   */
  updateOsmQuerry(osmQuerry: OsmQuerry) {
    return this.safePut('/api/datasource/osm/' + osmQuerry.provider_vector_id, osmQuerry)
  }

  /**
   * add   Querry
   * @param querry Querry
   */
  addQuerry(querry: Querry) {
    return this.safePost('/api/datasource/querry', querry,)
  }

  /**
  * add   Querry
  * @param querry Querry
  */
  updateQuerry(querry: Querry) {
    return this.safePut('/api/datasource/querry/' + querry.provider_vector_id, querry)
  }

  /**
  * get a  querry by vector_provider_id
  * @param id number 
  * @returns Observable<Querry|HttpErrorResponse>
  */
  getQuerry(id: number): Observable<Querry> {
    return this.safeGet<Querry>('/api/datasource/querry/' + id)
  }

  /**
  * get a osm querry by osm_vector_provider_id
  * @param id number 
  * @returns Observable<OsmQuerry|HttpErrorResponse>
  */
  getOsmQuerry(id: number): Observable<OsmQuerry> {

    return this.safeGet<OsmQuerry>('/api/datasource/osm/' + id)
  }




  /**
  * Make a get request to Backend
  * @param string path url
  */
  getRequest(path: string): Promise<any> {
    let promise = new Promise((resolve, reject) => {
      this.safeGet(path)
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




}
