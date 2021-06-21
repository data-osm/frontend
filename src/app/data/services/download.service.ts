import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VectorProvider } from '../../type/type';
import { CountFeature } from '../models/download';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend
  /**
   * Actif profil id
   */

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
   * count layers in one adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
   countFeaturesInAdminBoundary(layer_ids:Array<number>, admin_boundary_id:number, table_id:number):Observable<CountFeature[]>{
    return this.http.post<CountFeature[]>(this.url_prefix+'/api/group/count',{
      layer_ids:layer_ids,
      provider_vector_id:admin_boundary_id,
      table_id:table_id
    },{headers: this.get_header()})
  }

}
