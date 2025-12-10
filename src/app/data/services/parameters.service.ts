import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Polygon } from '@svgdotjs/svg.js';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Feature, FeatureLike, Geometry } from '../../ol-module';
import { AdminBoundary, Parameter, AppExtent, AdminBoundaryRespone, AdminBoundaryFeature, LczZone } from '../models/parameters';
import { FrameRenderTime } from '../../../helper/type';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class ParametersService extends OsmDataRequest {


  /**
   * List of app extents with geometry
   */
  lisAppExtent$: BehaviorSubject<AppExtent[]> = new BehaviorSubject<AppExtent[]>([])
  parameter$: BehaviorSubject<Parameter> = new BehaviorSubject<Parameter>(undefined)
  private useCase: "icu" | undefined = undefined

  /**
   * Polygon of the project 
   */
  projectPolygon: Feature<Geometry>
  /**
   * Actif profil id
   */
  private mapProfilId: number

  lczZones: LczZone[] = []

  constructor(
    private http_: HttpClient,
  ) {
    super(http_)
  }

  get parameter() {
    return this.parameter$.getValue()
  }

  set parameter(parameter: Parameter) {
    this.parameter$.next(parameter)
  }

  set mapId(id: number) {
    this.mapProfilId = id
  }

  get mapId() {
    return this.mapProfilId
  }

  set mapUseCase(useCase: "icu" | undefined) {
    if (useCase == "icu") {
      this.useCase = "icu"
    } else {

      this.useCase = undefined
    }
  }

  get mapUseCase() {
    return this.useCase
  }

  get defaultInitLocalisation(): [number, number, number, number, number, number] {
    const parisPov: [number, number, number, number, number, number] = [260354.7, 6252644.5, 301.2, 259689, 6252821.8, 0]
    const grenoblePov: [number, number, number, number, number, number] = [639189.8, 5650300.5, 349.5, 638234.9, 5651098.8, 0]
    if (this.useCase == "icu") {
      return grenoblePov
    }
    return parisPov
  }

  get buildingSettings(): {
    "outlineHeight": number | undefined,
    "skirtOffset": number | undefined
  } {
    if (this.useCase == "icu") {
      return {
        "outlineHeight": 4,
        "skirtOffset": 4
      }
    }
    return {
      "outlineHeight": undefined,
      "skirtOffset": undefined
    }

  }

  get dateTimesInterval(): {
    "start": number | null,
    "end": number | null
  } {
    if (this.useCase == "icu") {
      return {
        "start": Date.UTC(2020, 6, 24, 0, 0, 0, 0),
        "end": Date.UTC(2020, 7, 4, 23, 0, 0, 0),
      }
    }
    return {
      "start": null,
      "end": null
    }
  }
  get customBuildingUniforms(): "TEMPERATURE_UNIFORM" | null {
    if (this.useCase == "icu") {
      return "TEMPERATURE_UNIFORM"
    }
    return
  }

  loadProfilCustomisations() {
    if (this.useCase == "icu") {
      return this.listLczZones().pipe(
        tap((lczZones) => {
          this.lczZones = lczZones
        }),
      )
    }
    return EMPTY

  }

  /**
   * Get parameters of the app
   * @returns Observable<Parameter> 
   */
  getParameters(): Observable<Parameter> {
    return this.safeGet<Parameter[]>('/api/parameter/parameter').pipe(
      map((response) => {
        if (response.length > 0) {
          response[0].can_hide_buildings = false
          this.parameter = response[0]

          return response[0]
        }
        return {} as Parameter
      })
    )
  }

  /**
   * Add a adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  addAdminstrativeBoundary(adminBoundary: any): Observable<any> {
    return this.safePost<any>('/api/parameter/admin_boundary', adminBoundary)
  }

  /**
   * update a adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  updateAdminstrativeBoundary(adminBoundary: AdminBoundary): Observable<any> {
    return this.safePut<any>('/api/parameter/admin_boundary/' + adminBoundary.admin_boundary_id, adminBoundary)
  }

  /**
   * destroy a adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  destroyAdminstrativeBoundary(admin_boundary_id: number): Observable<any> {
    return this.safeDelete<any>('/api/parameter/admin_boundary/' + admin_boundary_id)
  }

  /**
   * Add a parameter
   * @param parameter Parameter
   * @returns Observable<any>
   */
  addParameter(parameter: any): Observable<any> {
    return this.safePost<any>('/api/parameter/parameter/add', parameter)
  }

  /**
   * update a parameter
   * @param parameter Parameter
   * @returns Observable<any>
   */
  updateParameter(parameter: any): Observable<any> {
    return this.safePut<any>('/api/parameter/parameter/' + parameter.parameter_id, parameter)
  }

  /**
   * get the app extent 
   * @param geometry boolean
   * @param tolerance number the tolrance to simplify the geometry with ST_SimplifyPreserveTopology function
   * @returns Observable<AppExtent>
   */
  getAppExtent(geometry: boolean = false, tolerance: number = 0): Observable<AppExtent> {
    return this.safeGet<AppExtent>('/api/parameter/extent?geometry=' + geometry + '&tolerance=' + tolerance)

  }

  /**
   * get one app extent by id with his extent
   * @returns Observable<AppExtent>
   */
  getAppExtentById(id: number): Observable<AppExtent> {
    return this.safePost<AppExtent>('/api/parameter/extent/get', { id: id })

  }
  /**
   * get the list of app extent
   * @param geometry boolean
   * @param tolerance number the tolrance to simplify the geometry with ST_SimplifyPreserveTopology function
   * @returns Observable<AppExtent[]>
   */
  getListAppExtent(geometry: boolean = false, tolerance: number = 0): Observable<AppExtent[]> {
    return this.safeGet<AppExtent[]>('/api/parameter/extent/list?geometry=' + geometry + '&tolerance=' + tolerance)
  }

  /**
   * Search admin boundary
   * @param querry string
   * @returns Observable<AdminBoundaryRespone[]>
   */
  searchAdminBoundary(querry: string): Observable<AdminBoundaryRespone[]> {
    return this.safePost<AdminBoundaryRespone[]>("/api/parameter/admin_boundary/search", { search_word: querry })
  }

  /**
   * Get a admin boundary feature with his geometry
   * @param provider_vector_id number
   * @param table_id number
   * @returns Observable<AdminBoundaryFeature>
   */
  getAdminBoundaryFeature(provider_vector_id: number, table_id: number): Observable<AdminBoundaryFeature> {
    return this.safePost<AdminBoundaryFeature>("/api/parameter/admin_boundary/feature", { vector_id: provider_vector_id, table_id: table_id })
  }

  /**
   * Log render time per frame for analytics
   * @param frame_render_time 
   * @param layers_ids 
   * @param layers_names 
   * @param extent_size 
   * @param extent 
   * @returns 
   */
  logRenderTimePerFrame(frame_render_time_value: { [key: number]: FrameRenderTime }, layers_ids: number[], layers_names: string[], extent_size: [number, number], extent: string, current_url: string) {

    const frame_render_time = Object.keys(frame_render_time_value).map((frame_index) => {
      return {
        frame_index: frame_index, render_time: frame_render_time_value[parseInt(frame_index)].render_time, total_render_time: frame_render_time_value[parseInt(frame_index)].total_render_time
      }
    })
    return this.safePost("/api/logs/log-render-time-per-frame", {
      frame_render_time, layers_ids, layers_names, extent_size, extent, current_url
    })

  }

  createNPSFeedback(score: number) {
    return this.safePost("/api/logs/nps", { score })
  }

  listLczZones() {
    return this.safeGet<Array<LczZone>>("/api/parameter/list-lcz")
  }

}