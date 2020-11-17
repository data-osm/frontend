import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Style } from '../../../type/type';

@Injectable({
  providedIn: 'root'
})
export class StyleService {

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
  get_header(): HttpHeaders {
    this.headers = this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }

  /**
   * get all styles of a vector provider
   * @param provider_vector_id number
   * @returns Observable<Style[]>
   */
  getAllStylesOfVectorProvider(provider_vector_id:number):Observable<Style[]>{
    return this.http.get<Array<Style>>(this.url_prefix+'/api/provider/style/'+provider_vector_id,{ headers: this.get_header() })
  }

  /**
   * update a style
   * @param style FormData
   * @returns Observable<Style>
   */
  updateStyle(style:FormData):Observable<Style>{
    return this.http.put<Style>(this.url_prefix+'/api/provider/style/'+style.get('provider_style_id'),style,{ headers: this.get_header() })
  }
  
  /**
   * add a style
   * @param style FormData
   * @returns Observable<Style>
   */
  addStyle(style:FormData):Observable<Style>{
    return this.http.post<Style>(this.url_prefix+'/api/provider/style/'+style.get('provider_vector_id'),style,{ headers: this.get_header() })
  }

}
