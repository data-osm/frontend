import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Group, Layer, LayerProviders, Map, SubGroup } from '../../../type/type';
import { NotifierService } from 'angular-notifier';

@Injectable({
  providedIn: 'root'
})
export class MapsService {

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
 * Get header
 * @returns HttpHeaders
 */
  get_header(): HttpHeaders {
    this.headers = this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }

  /**
   * get all maps 
   * @returns Observable<Map[]>
   */
  getAllMaps():Observable<Map[]> {
    return this.http.get<Map[]>(this.url_prefix + '/api/group/map', { headers: this.get_header() })
  }

  /**
   * update a map
   * @param map Map
   * @returns Observable<Map>
   */
  updateMap(map:Map):Observable<Map> {
    return this.http.put<Map>(this.url_prefix + '/api/group/map/'+map.map_id,map, { headers: this.get_header() })
  }

  /**
   * add a map
   * @param map Map
   * @returns Observable<Map>
   */
  addMap(map:Map):Observable<Map>{
    return this.http.post<Map>(this.url_prefix + '/api/group/map',map, { headers: this.get_header() })
  }

  /**
   * Delete a Map
   * @param map Map
   */
  deleteMap(map:Map):Observable<HttpResponse<any>>{
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/map/'+map.map_id, { headers: this.get_header() })
  }
  /**
   * Get all group of a map
   * @param map_id number
   * @returns Observable<Group[]>
   */
  getAllGroupOfMap(map_id:number):Observable<Group[]>{
    return this.http.get<Group[]>(this.url_prefix + '/api/group/group?map='+map_id, { headers: this.get_header() })
  }

  /**
   * Add a group
   * @param group Group
   */
  addGroup(group:Group):Observable<Group>{
    return this.http.post<Group>(this.url_prefix + '/api/group/group',group, { headers: this.get_header() })
  }

  /**
   * Update a group
   * @param group Group
   */
  updateGroup(group:Group):Observable<Group>{
    return this.http.put<Group>(this.url_prefix + '/api/group/group/'+group.group_id,group, { headers: this.get_header() })
  }

  /**
   * Delete group
   * @param group Group
   */
  deleteGroup(group:Group):Observable<HttpResponse<any>>{
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/group/'+group.group_id, { headers: this.get_header() })
  }

  /**
   * Get all sub group a group
   * @param group_id number
   */
  getAllSubGroupOfGroup(group_id:number):Observable<SubGroup[]>{
    return this.http.get<SubGroup[]>(this.url_prefix + '/api/group/sub?group_id='+group_id, { headers: this.get_header() })
  }

  /**
   * Update a sub  group
   * @param subGroup SubGroup
   */
  updateSubGroup(subGroup:SubGroup):Observable<SubGroup>{
    return this.http.put<SubGroup>(this.url_prefix + '/api/group/sub/'+subGroup.group_sub_id,subGroup, { headers: this.get_header() })
  }

  /**
   * Delete a sub group
   * @param subGroup SubGroup
   */
  deleteSubGroup(subGroup:SubGroup):Observable<HttpResponse<any>>{
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/sub/'+subGroup.group_sub_id, { headers: this.get_header() })
  }

  /**
   * Add a subgroup
   * @param subGroup SubGroup
   */
  addSubGroup(subGroup:SubGroup):Observable<SubGroup>{
    return this.http.post<SubGroup>(this.url_prefix + '/api/group/sub',subGroup, { headers: this.get_header() })
  }

  /**
   * Get all layers of a sub group
   * @param group_sub_id number
   */
  getAllLayersFromSubGroup(group_sub_id:number):Observable<Layer[]>{
    return this.http.get<Layer[]>(this.url_prefix + '/api/group/layer?sub='+group_sub_id, { headers: this.get_header() })
  }

   /**
   * Add a layer
   * @param layer Layer
   */
  addLayer(layer:Layer):Observable<Layer[]>{
    return this.http.post<Layer[]>(this.url_prefix + '/api/group/layer',layer, { headers: this.get_header() })
  }

  /**
   * get a layer by id
   */
  getLayer(layer_id:number):Observable<Layer>{
    return this.http.get<Layer>(this.url_prefix + '/api/group/layer/'+layer_id, { headers: this.get_header() }) 
  }

  /**
   * add provider with style to a layer
   */
  addProviderWithStyleToLayer(parameter:{layer_id:number, vs_id:number, vp_id:number}):Observable<LayerProviders>{

    return this.http.post<LayerProviders>(this.url_prefix + '/api/group/layer/provider',parameter, { headers: this.get_header() })

  }

  /**
   * get all providers of a map
   */
  getProviderWithStyleOfLayer(layer_id:number):Observable<Array<LayerProviders>>{
    return this.http.get<Array<LayerProviders>>(this.url_prefix + '/api/group/layer/provider/'+layer_id, { headers: this.get_header() })
  }

}
