import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retryWhen } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseMap } from '../models/base-maps';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class BaseMapsService extends OsmDataRequest {


  constructor(
    private http_: HttpClient,
  ) {
    super(http_)
  }



  /**
   * Get list of all base maps
   * @returns Observable<BaseMap[]>
   */
  getBaseMaps(): Observable<BaseMap[]> {
    return this.safeGet<BaseMap[]>('/api/group/basemaps')
  }

  /**
   * Add a base map
   * @param baseMap any
   * @returns Observable<BaseMap>
   */
  addBaseMap(baseMap: any): Observable<BaseMap> {
    return this.safePost<BaseMap>('/api/group/basemaps', baseMap,)
  }

  /**
   * Delete a base map
   * @param id number
   * @returns Observable<any>
   */
  deleteBaseMap(id: number): Observable<any> {
    return this.safeDelete<any>('/api/group/basemaps/' + id)
  }

  /**
   * Update a base map
   * @param parameters FormData
   * @returns Observable<BaseMap>
   */
  updateBaseMap(parameters: FormData): Observable<BaseMap> {
    return this.safePut<BaseMap>('/api/group/basemaps/' + parameters.get('id'), parameters,)
  }

  /**
   * Set a base map as the princiapl one
   * @param id number
   * @returns Observable<BaseMap>
   */
  setBaseMapPrincipal(id: number): Observable<{}> {
    return this.safePost<{}>('/api/group/basemaps/principal', { id },)
  }
}
