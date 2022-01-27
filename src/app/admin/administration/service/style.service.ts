import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpResponse, Style, CustomStyle } from '../../../type/type';

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
    return this.http.get<Array<Style>>(this.url_prefix+'/api/provider/style/vector/'+provider_vector_id,{ headers: this.get_header() })
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
   * delete a style
   * @param provider_style_id number
   * @returns Observable<Style>
   */
  deleteStyle(provider_style_id:number):Observable<HttpResponse>{
    return this.http.delete<HttpResponse>(this.url_prefix+'/api/provider/style/'+provider_style_id,{ headers: this.get_header() })
  }
  
  /**
   * add a style
   * @param style FormData
   * @returns Observable<Style>
   */
  addStyle(style:FormData|Object):Observable<Style>{
    let provider_vector_id
    if (style instanceof FormData ) {
      provider_vector_id = style.get('provider_vector_id')
    } else {
      provider_vector_id = style['provider_vector_id']
    }
    return this.http.post<Style>(this.url_prefix+'/api/provider/style/vector/'+provider_vector_id,style,{ headers: this.get_header() })
  }

   /**
   * list all custom styles
   * @returns Observable<Style>
   */
  listCustomStyles():Observable<CustomStyle[]>{
    return this.http.get<CustomStyle[]>(this.url_prefix+'/api/provider/style/custom',{ headers: this.get_header() })
  }

   /**
   * list all custom styles of a geometryType
   * @returns Observable<Style>
   */
    listCustomStylesOfGeometryType(geometryType:'Point'|'Polygon'|'LineString'):Observable<CustomStyle[]>{
      return this.http.get<CustomStyle[]>(this.url_prefix+'/api/provider/style/custom?geometry_type='+geometryType,{ headers: this.get_header() })
    }

}
