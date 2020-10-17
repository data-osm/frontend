import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject,from } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Icon } from '../../../type/type';
@Injectable({
  providedIn: 'root'
})
/**
 * get all icons, group of icons, add icons, edit, delete it
 */
export class IconService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend

  constructor(
    private http: HttpClient
  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
  }


  /**
   * Get header
   * @returns HttpHeaders
   */
  get_header():HttpHeaders {
    this.headers = this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }

  /**
   * get all group icons existing
   * @returns Observable<string[]>
   */
  getExistsCategoryIcons():Observable<string[]>{
    return from(this.getRequest('api/group/icons/category')).pipe(
      map((existGroups:string[])=>{
          return existGroups
      }),
      catchError((err)=>{
          throw new Error(err);
      })
    )
  }

  /**
   * add  icon
   * @param group 
   */
  uploadIcon(icon:any){
    return from(this.http.post(this.url_prefix + 'api/group/icons/add', icon, { headers: this.get_header(),reportProgress: true, observe: 'events' }).pipe(
      map((value:HttpResponse<any>)=>{return value.body})
    ))
    // return from(this.post_requete('api/group/icons/add',icon))
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
  console.log(data)
  return new Promise((resolve, reject) => {
    this.http.post(this.url_prefix + url, data, { headers: this.get_header(),reportProgress: true,
      observe: 'events' })
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
