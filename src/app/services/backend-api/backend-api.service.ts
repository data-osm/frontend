import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
/**
 * Service to make request to backend or other services
 */
export class BackendApiService {

  headers: HttpHeaders = new HttpHeaders({});
  headers_nodejs: Headers = new Headers({});
  url_prefix = environment.url_prefix

  constructor(
    private http: HttpClient
  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.headers_nodejs.append('Content-Type', 'application/json');
  }

  /**
   * Get header
   */
  get_header() {
    // this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }

    /**
 * Make a get request to other host. Here you must specified all the path of your request
 * @param string path url
 */
getRequestFromOtherHost(path:string):Promise<any> {

  let promise = new Promise((resolve, reject) => {
    this.http.get(path,{headers:this.headers})
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
 * Make a get request to Backend
 * @param string path url
 */
  getRequest(path:string):Promise<any> {

    let promise = new Promise((resolve, reject) => {
      this.http.get(this.url_prefix + path,{headers:this.headers})
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
  post_requete(url:string,data:Object):Promise<any> {

    return new Promise((resolve, reject) => {
      this.http.post(this.url_prefix+url,data,{headers: this.get_header()})
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
