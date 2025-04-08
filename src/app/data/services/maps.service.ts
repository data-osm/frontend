import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { NotifierService } from 'angular-notifier';
import { environment } from '../../../environments/environment';
import { Group, SubGroup, LayerProviders, ReorderProvider, Tag, Metadata, Map as MapInterface, Layer, SubGroupWithLayers, SubGroupWithGroup } from '../../type/type';
import { VectorTileSource } from '../../ol-module';
import Flatbush from 'flatbush';

@Injectable({
  providedIn: 'root'
})
export class MapsService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend
  private readonly notifier: NotifierService;
  // Map of Index ID of a building in FlatBush index and his corresponding height
  buildingsHeights$ = new BehaviorSubject<Map<number, number>>(new Map());
  // Index for fast searching building around a position
  buildingsIndex$ = new BehaviorSubject<Flatbush>(new Flatbush(1));

  constructor(
    private http: HttpClient,
    notifierService: NotifierService,

  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.notifier = notifierService;
  }

  getBuildingHeights() {
    return this.buildingsHeights$.getValue()
  }

  getBuildingsIndex() {
    return this.buildingsIndex$.getValue()
  }

  getLocalMapBoxStyle() {
    return this.http.get("./assets/dark-v11.json")
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
   * Search map
   * @param search_word string
   * @returns Observable<Map[]>
   */
  searchMap(search_word: string): Observable<MapInterface[]> {
    return this.http.post<MapInterface[]>(this.url_prefix + '/api/group/map/search', { 'search_word': search_word }, { headers: this.get_header() })
  }

  /**
   * get all maps 
   * @returns Observable<Map[]>
   */
  getAllMaps(): Observable<MapInterface[]> {
    return this.http.get<MapInterface[]>(this.url_prefix + '/api/group/map', { headers: this.get_header() })
  }

  /**
   * update a map
   * @param map Map
   * @returns Observable<Map>
   */
  updateMap(map: MapInterface): Observable<MapInterface> {
    return this.http.put<MapInterface>(this.url_prefix + '/api/group/map/' + map.map_id, map, { headers: this.get_header() })
  }

  /**
   * add a map
   * @param map Map
   * @returns Observable<Map>
   */
  addMap(map: MapInterface): Observable<MapInterface> {
    return this.http.post<MapInterface>(this.url_prefix + '/api/group/map', map, { headers: this.get_header() })
  }

  /**
   * Delete a Map
   * @param map Map
   */
  deleteMap(map: MapInterface): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/map/' + map.map_id, { headers: this.get_header() })
  }
  /**
   * Get all group of a map
   * @param map_id number
   * @returns Observable<Group[]>
   */
  getAllGroupOfMap(map_id: number): Observable<Group[]> {
    return this.http.get<Group[]>(this.url_prefix + '/api/group?map=' + map_id, { headers: this.get_header() })
  }

  /**
   * Add a group
   * @param group Group
   */
  addGroup(group: Group): Observable<Group> {
    return this.http.post<Group>(this.url_prefix + '/api/group/', group, { headers: this.get_header() })
  }

  /**
   * get a group
   * @param group Group
   */
  getGroup(group_id: number): Observable<Group> {
    return this.http.get<Group>(this.url_prefix + '/api/group/group/' + group_id, { headers: this.get_header() })
  }

  /**
   * Update a group
   * @param group Group
   */
  updateGroup(group: Group): Observable<Group> {
    return this.http.put<Group>(this.url_prefix + '/api/group/group/' + group.group_id, group, { headers: this.get_header() })
  }

  /**
   * update a layer
   * @param layer_id number
   */
  setGroupPrincipal(group: Group): Observable<Group> {
    return this.http.post<Group>(this.url_prefix + '/api/group/group/' + group.group_id + '/set-principal', {}, { headers: this.get_header() })
  }

  /**
   * Reorder groups
   * @param reorderGroups Array<{group_id:number, order:number}>
   * @returns Observable<[]>
   */
  reorderGroups(reorderGroups: Array<{ group_id: number, order: number }>): Observable<[]> {
    return this.http.post<[]>(this.url_prefix + '/api/group/group/reorder', { reorderGroups }, { headers: this.get_header() })
  }

  /**
   * Delete group
   * @param group Group
   */
  deleteGroup(group: Group): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/group/' + group.group_id, { headers: this.get_header() })
  }

  /**
   * Get all sub group a group
   * @param group_id number
   */
  getAllSubGroupOfGroup(group_id: number): Observable<SubGroup[]> {
    return this.http.get<SubGroup[]>(this.url_prefix + '/api/group/sub?group_id=' + group_id, { headers: this.get_header() })
  }

  /**
  * Get all sub group a group
  * @param group_id number
  */
  getAllSubGroupWithLayersOfGroup(group_id: number): Observable<SubGroupWithLayers[]> {
    return this.http.get<SubGroupWithLayers[]>(this.url_prefix + '/api/group/sub/layers?group_id=' + group_id, { headers: this.get_header() })
  }

  /**
   * Update a sub  group
   * @param subGroup SubGroup
   */
  updateSubGroup(subGroup: SubGroup): Observable<SubGroup> {
    return this.http.put<SubGroup>(this.url_prefix + '/api/group/sub/' + subGroup.group_sub_id, subGroup, { headers: this.get_header() })
  }
  /**
   * get sub with his group
   * @param sub_id number
   * @returns 
   */
  getSubWithGroup(group_sub_id: number): Observable<SubGroupWithGroup> {
    return this.http.get<SubGroupWithGroup>(this.url_prefix + '/api/group/sub/group/' + group_sub_id, { headers: this.get_header() })
  }

  /**
   * Delete a sub group
   * @param subGroup SubGroup
   */
  deleteSubGroup(subGroup: SubGroup): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(this.url_prefix + '/api/group/sub/' + subGroup.group_sub_id, { headers: this.get_header() })
  }

  /**
   * Add a subgroup
   * @param subGroup SubGroup
   */
  addSubGroup(subGroup: SubGroup): Observable<SubGroup> {
    return this.http.post<SubGroup>(this.url_prefix + '/api/group/sub', subGroup, { headers: this.get_header() })
  }

  /**
   * Get all layers of a sub group
   * @param group_sub_id number
   */
  getAllLayersFromSubGroup(group_sub_id: number): Observable<Layer[]> {
    let query_params = 'sub=' + group_sub_id
    return this.http.get<Layer[]>(this.url_prefix + '/api/group/layer?' + query_params, { headers: this.get_header() })
  }

  /**
   * Get all layers of a sub group
   * @param group_sub_id number
   */
  getAllPrincipalLayersFromGroup(group_id: number, principal = null): Observable<Layer[]> {
    let query_params = 'sub__group=' + group_id
    if (principal != null) {
      query_params = query_params + "&principal=" + principal
    }
    return this.http.get<Layer[]>(this.url_prefix + '/api/group/layer?' + query_params, { headers: this.get_header() })
  }



  /**
  * Add a layer
  * @param layer Layer
  */
  addLayer(layer: Layer): Observable<Layer[]> {
    return this.http.post<Layer[]>(this.url_prefix + '/api/group/layer', layer, { headers: this.get_header() })
  }

  /**
   * get a layer by old id
   */
  getLayerByOldId(layer_id: number): Observable<{ layer: Layer, group: Group }> {
    return this.http.post<{ layer: Layer, group: Group }>(this.url_prefix + '/api/group/layer/old', { layer_id }, { headers: this.get_header() })
  }

  /**
   * get a layer by id
   */
  getLayer(layer_id: number): Observable<Layer> {
    return this.http.get<Layer>(this.url_prefix + '/api/group/layer/' + layer_id, { headers: this.get_header() })
  }

  /**
   * update a layer
   * @param layer_id number
   */
  updateLayer(layer: Layer): Observable<Layer> {
    return this.http.put<Layer>(this.url_prefix + '/api/group/layer/' + layer.layer_id, layer, { headers: this.get_header() })
  }

  /**
   * update a layer
   * @param layer_id number
   */
  changeLayerPrincipal(layer: Layer, principal: boolean): Observable<Layer> {
    return this.http.post<Layer>(this.url_prefix + '/api/group/layer/' + layer.layer_id + "/set-principal", { principal }, { headers: this.get_header() })
  }

  /**
   * delete a layer
   * @param layer_id number
   */
  deleteLayer(layer_id: number) {
    return this.http.delete(this.url_prefix + '/api/group/layer/' + layer_id, { headers: this.get_header() })
  }

  /**
   * add provider with style to a layer
   */
  addProviderWithStyleToLayer(parameter: { layer_id: number, vs_id: number, vp_id: number }): Observable<LayerProviders> {

    return this.http.post<LayerProviders>(this.url_prefix + '/api/group/layer/provider', parameter, { headers: this.get_header() })

  }

  /**
   * update a provider of a layer
   */
  updateProviderWithStyleOfLayer(layerProviders_id, parameter: { layer_id: number, vs_id: number, vp_id: number }): Observable<LayerProviders> {
    return this.http.put<LayerProviders>(this.url_prefix + '/api/group/layer/provider/' + layerProviders_id, parameter, { headers: this.get_header() })
  }

  /**
   * get all providers of a map
   */
  getProviderWithStyleOfLayer(layer_id: number): Observable<Array<LayerProviders>> {
    return this.http.get<Array<LayerProviders>>(this.url_prefix + '/api/group/layer/provider?layer_id=' + layer_id, { headers: this.get_header() })
  }

  /**
   * dedelete a provider in a layer providers
   * @param id number
   */
  deleteProviderWithStyleOfLayer(id: number) {
    return this.http.delete(this.url_prefix + '/api/group/layer/provider/' + id, { headers: this.get_header() })
  }

  /**
   * Re order providers in a layer providers
   * @param reorderProvider ReorderProvider
   */
  reorderProvidersInLayerProviders(reorderProvider: Array<ReorderProvider>) {
    return this.http.post(this.url_prefix + '/api/group/layer/provider/reorder', { reorderProviders: reorderProvider }, { headers: this.get_header() })
  }

  /**
   * Search a tag
   * @param search_word string
   * @returns Observable<Array<Tag>>
   */
  searchTags(search_word: string): Observable<Array<Tag>> {
    return this.http.post<Array<Tag>>(this.url_prefix + '/api/group/layer/tags/search', { search_word: search_word }, { headers: this.get_header() })
  }

  /**
   * Get Metadata of a layer
   * @param layer_id number
   * @returns Observable<Metadata>
   */
  getLayerMetadata(layer_id: number): Observable<Metadata> {
    return this.http.get<Metadata>(this.url_prefix + '/api/group/metadata?layer=' + layer_id, { headers: this.get_header() })
  }

  /**
   * Add Metadata
   * @param metadata 
   */
  addMetadata(metadata: Metadata) {
    return this.http.post(this.url_prefix + '/api/group/metadata', metadata, { headers: this.get_header() })
  }

  /**
   * update Metadata
   * @param metadata 
   */
  updateMetadata(metadata: Metadata) {
    return this.http.put(this.url_prefix + '/api/group/metadata/' + metadata.id, metadata, { headers: this.get_header() })
  }

}
