import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { NotifierService } from 'angular-notifier';
import { environment } from '../../../environments/environment';
import { Group, SubGroup, LayerProviders, ReorderProvider, Tag, Metadata, Map as MapInterface, Layer, SubGroupWithLayers, SubGroupWithGroup } from '../../type/type';
import { VectorTileSource } from '../../ol-module';
import Flatbush from 'flatbush';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class MapsService extends OsmDataRequest {

  private readonly notifier: NotifierService;
  // Map of Index ID of a building in FlatBush index and his corresponding height
  buildingsHeights$ = new BehaviorSubject<Map<number, number>>(new Map());
  // Index for fast searching building around a position
  buildingsIndex$ = new BehaviorSubject<Flatbush>(new Flatbush(1));

  constructor(
    private http_: HttpClient,
    notifierService: NotifierService,

  ) {
    super(http_)
    this.notifier = notifierService;
  }

  getBuildingHeights() {
    return this.buildingsHeights$.getValue()
  }

  getBuildingsIndex() {
    return this.buildingsIndex$.getValue()
  }

  getLocalMapBoxStyle() {
    return this.http_.get("./assets/dark-v11.json")
  }




  /**
   * Search map
   * @param search_word string
   * @returns Observable<Map[]>
   */
  searchMap(search_word: string): Observable<MapInterface[]> {
    return this.safePost<MapInterface[]>('/api/group/map/search', { 'search_word': search_word })
  }

  /**
   * get all maps 
   * @returns Observable<Map[]>
   */
  getAllMaps(): Observable<MapInterface[]> {
    return this.safeGet<MapInterface[]>('/api/group/map')
  }

  /**
   * update a map
   * @param map Map
   * @returns Observable<Map>
   */
  updateMap(map: MapInterface): Observable<MapInterface> {
    return this.safePut<MapInterface>('/api/group/map/' + map.map_id, map)
  }

  /**
   * add a map
   * @param map Map
   * @returns Observable<Map>
   */
  addMap(map: MapInterface): Observable<MapInterface> {
    return this.safePost<MapInterface>('/api/group/map', map)
  }

  /**
   * Delete a Map
   * @param map Map
   */
  deleteMap(map: MapInterface): Observable<HttpResponse<any>> {
    return this.safeDelete<HttpResponse<any>>('/api/group/map/' + map.map_id)
  }
  /**
   * Get all group of a map
   * @param map_id number
   * @returns Observable<Group[]>
   */
  getAllGroupOfMap(map_id: number): Observable<Group[]> {
    return this.safeGet<Group[]>('/api/group?map=' + map_id)
  }

  /**
   * Add a group
   * @param group Group
   */
  addGroup(group: Group): Observable<Group> {
    return this.safePost<Group>('/api/group/', group)
  }

  /**
   * get a group
   * @param group Group
   */
  getGroup(group_id: number): Observable<Group> {
    return this.safeGet<Group>('/api/group/group/' + group_id)
  }

  /**
   * Update a group
   * @param group Group
   */
  updateGroup(group: Group): Observable<Group> {
    return this.safePut<Group>('/api/group/group/' + group.group_id, group)
  }

  /**
   * update a layer
   * @param layer_id number
   */
  setGroupPrincipal(group: Group): Observable<Group> {
    return this.safePost<Group>('/api/group/group/' + group.group_id + '/set-principal', {})
  }

  /**
   * Reorder groups
   * @param reorderGroups Array<{group_id:number, order:number}>
   * @returns Observable<[]>
   */
  reorderGroups(reorderGroups: Array<{ group_id: number, order: number }>): Observable<[]> {
    return this.safePost<[]>('/api/group/group/reorder', { reorderGroups })
  }

  /**
   * Delete group
   * @param group Group
   */
  deleteGroup(group: Group): Observable<HttpResponse<any>> {
    return this.safeDelete<HttpResponse<any>>('/api/group/group/' + group.group_id)
  }

  /**
   * Get all sub group a group
   * @param group_id number
   */
  getAllSubGroupOfGroup(group_id: number): Observable<SubGroup[]> {
    return this.safeGet<SubGroup[]>('/api/group/sub?group_id=' + group_id)
  }

  /**
  * Get all sub group a group
  * @param group_id number
  */
  getAllSubGroupWithLayersOfGroup(group_id: number): Observable<SubGroupWithLayers[]> {
    return this.safeGet<SubGroupWithLayers[]>('/api/group/sub/layers?group_id=' + group_id)
  }

  /**
   * Update a sub  group
   * @param subGroup SubGroup
   */
  updateSubGroup(subGroup: SubGroup): Observable<SubGroup> {
    return this.safePut<SubGroup>('/api/group/sub/' + subGroup.group_sub_id, subGroup)
  }
  /**
   * get sub with his group
   * @param sub_id number
   * @returns 
   */
  getSubWithGroup(group_sub_id: number): Observable<SubGroupWithGroup> {
    return this.safeGet<SubGroupWithGroup>('/api/group/sub/group/' + group_sub_id)
  }

  /**
   * Delete a sub group
   * @param subGroup SubGroup
   */
  deleteSubGroup(subGroup: SubGroup): Observable<HttpResponse<any>> {
    return this.safeDelete<HttpResponse<any>>('/api/group/sub/' + subGroup.group_sub_id)
  }

  /**
   * Add a subgroup
   * @param subGroup SubGroup
   */
  addSubGroup(subGroup: SubGroup): Observable<SubGroup> {
    return this.safePost<SubGroup>('/api/group/sub', subGroup)
  }

  /**
   * Get all layers of a sub group
   * @param group_sub_id number
   */
  getAllLayersFromSubGroup(group_sub_id: number): Observable<Layer[]> {
    let query_params = 'sub=' + group_sub_id
    return this.safeGet<Layer[]>('/api/group/layer?' + query_params)
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
    return this.safeGet<Layer[]>('/api/group/layer?' + query_params)
  }



  /**
  * Add a layer
  * @param layer Layer
  */
  addLayer(layer: Layer): Observable<Layer[]> {
    return this.safePost<Layer[]>('/api/group/layer', layer)
  }

  /**
   * get a layer by old id
   */
  getLayerByOldId(layer_id: number): Observable<{ layer: Layer, group: Group }> {
    return this.safePost<{ layer: Layer, group: Group }>('/api/group/layer/old', { layer_id })
  }

  /**
   * get a layer by id
   */
  getLayer(layer_id: number): Observable<Layer> {
    return this.safeGet<Layer>('/api/group/layer/' + layer_id)
  }

  /**
   * update a layer
   * @param layer_id number
   */
  updateLayer(layer: Layer): Observable<Layer> {
    return this.safePut<Layer>('/api/group/layer/' + layer.layer_id, layer)
  }

  /**
   * update a layer
   * @param layer_id number
   */
  changeLayerPrincipal(layer: Layer, principal: boolean): Observable<Layer> {
    return this.safePost<Layer>('/api/group/layer/' + layer.layer_id + "/set-principal", { principal })
  }

  /**
   * delete a layer
   * @param layer_id number
   */
  deleteLayer(layer_id: number) {
    return this.safeDelete('/api/group/layer/' + layer_id)
  }

  /**
   * add provider with style to a layer
   */
  addProviderWithStyleToLayer(parameter: { layer_id: number, vs_id: number, vp_id: number }): Observable<LayerProviders> {

    return this.safePost<LayerProviders>('/api/group/layer/provider', parameter)

  }

  /**
   * update a provider of a layer
   */
  updateProviderWithStyleOfLayer(layerProviders_id, parameter: { layer_id: number, vs_id: number, vp_id: number }): Observable<LayerProviders> {
    return this.safePut<LayerProviders>('/api/group/layer/provider/' + layerProviders_id, parameter)
  }

  /**
   * get all providers of a map
   */
  getProviderWithStyleOfLayer(layer_id: number): Observable<Array<LayerProviders>> {
    return this.safeGet<Array<LayerProviders>>('/api/group/layer/provider?layer_id=' + layer_id)
  }

  /**
   * dedelete a provider in a layer providers
   * @param id number
   */
  deleteProviderWithStyleOfLayer(id: number) {
    return this.safeDelete('/api/group/layer/provider/' + id)
  }

  /**
   * Re order providers in a layer providers
   * @param reorderProvider ReorderProvider
   */
  reorderProvidersInLayerProviders(reorderProvider: Array<ReorderProvider>) {
    return this.safePost('/api/group/layer/provider/reorder', { reorderProviders: reorderProvider })
  }

  /**
   * Search a tag
   * @param search_word string
   * @returns Observable<Array<Tag>>
   */
  searchTags(search_word: string): Observable<Array<Tag>> {
    return this.safePost<Array<Tag>>('/api/group/layer/tags/search', { search_word: search_word })
  }

  /**
   * Get Metadata of a layer
   * @param layer_id number
   * @returns Observable<Metadata>
   */
  getLayerMetadata(layer_id: number): Observable<Metadata> {
    return this.safeGet<Metadata>('/api/group/metadata?layer=' + layer_id)
  }

  /**
   * Add Metadata
   * @param metadata 
   */
  addMetadata(metadata: Metadata) {
    return this.safePost('/api/group/metadata', metadata)
  }

  /**
   * update Metadata
   * @param metadata 
   */
  updateMetadata(metadata: Metadata) {
    return this.safePut('/api/group/metadata/' + metadata.id, metadata)
  }

}
