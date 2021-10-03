import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Layer } from '../../type/type';

@Injectable({
  providedIn: 'root'
})
export class SearchLayerService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend

  constructor(
    private http: HttpClient,
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

  searchLayer(querry:string):Observable<Layer[]>{
    return this.http.post<Layer[]>(this.url_prefix+'/api/group/layer/search',{search_word:querry},{headers: this.get_header()})
  }
}
