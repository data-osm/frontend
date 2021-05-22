import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminBoundary, Parameter, AppExtent } from '../models/parameters';

@Injectable({
  providedIn: 'root'
})
export class ParametersService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend
  parameter:Parameter

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
   * Get parameters of the app
   * @returns Observable<Parameter> 
   */
  getParameters():Observable<Parameter>{
    return this.http.get<Parameter[]>(this.url_prefix+'/api/parameter/parameter',{headers: this.get_header()}).pipe(
      map((response)=>{
        if (response.length > 0 ) {
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
  addAdminstrativeBoundary(adminBoundary:any):Observable<any>{
    return this.http.post<any>(this.url_prefix+'/api/parameter/admin_boundary',adminBoundary,{headers: this.get_header()})
  }

  /**
   * update a adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  updateAdminstrativeBoundary(adminBoundary:AdminBoundary):Observable<any>{
    return this.http.put<any>(this.url_prefix+'/api/parameter/admin_boundary/'+adminBoundary.admin_boundary_id,adminBoundary,{headers: this.get_header()})
  }

  /**
   * destroy a adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  destroyAdminstrativeBoundary(admin_boundary_id:number):Observable<any>{
    return this.http.delete<any>(this.url_prefix+'/api/parameter/admin_boundary/'+admin_boundary_id ,{headers: this.get_header()})
  }

  /**
   * Add a parameter
   * @param parameter Parameter
   * @returns Observable<any>
   */
  addParameter(parameter:any):Observable<any>{
    return this.http.post<any>(this.url_prefix+'/api/parameter/parameter/add',parameter,{headers: this.get_header()})
  }

  /**
   * update a parameter
   * @param parameter Parameter
   * @returns Observable<any>
   */
   updateParameter(parameter:any):Observable<any>{
    return this.http.put<any>(this.url_prefix+'/api/parameter/parameter/'+parameter.parameter_id,parameter,{headers: this.get_header()})
  }
  
  /**
   * get the app extent 
   * @param geometry boolean
   * @returns Observable<AppExtent>
   */
  getAppExtent(geometry:boolean=false):Observable<AppExtent>{
    return this.http.get<AppExtent>(this.url_prefix+'/api/parameter/extent?geometry='+geometry,{headers: this.get_header()})

  }

  /**
   * get the list of app extent
   * @param geometry boolean
   * @returns Observable<AppExtent[]>
   */
   getListAppExtent(geometry:boolean=false):Observable<AppExtent[]>{
    return this.http.get<AppExtent[]>(this.url_prefix+'/api/parameter/extent/list?geometry='+geometry,{headers: this.get_header()})
  }

}