import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retryWhen } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseMap } from '../models/base-maps';

@Injectable({
  providedIn: 'root'
})
export class BaseMapsService {

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

  /**
   * Get list of all base maps
   * @returns Observable<BaseMap[]>
   */
  getBaseMaps():Observable<BaseMap[]>{
    return this.http.get<BaseMap[]>(this.url_prefix+'/api/group/basemaps',{headers: this.get_header()})
  }

  /**
   * Add a base map
   * @param baseMap any
   * @returns Observable<BaseMap>
   */
  addBaseMap(baseMap:any):Observable<BaseMap>{
    return this.http.post<BaseMap>(this.url_prefix+'/api/group/basemaps/add',baseMap, {headers: this.get_header()})
  }
  
  /**
   * Delete a base map
   * @param id number
   * @returns Observable<any>
   */
  deleteBaseMap(id:number):Observable<any>{
    return this.http.delete<any>(this.url_prefix+'/api/group/basemaps/'+id,{headers: this.get_header()} )
  }
}
