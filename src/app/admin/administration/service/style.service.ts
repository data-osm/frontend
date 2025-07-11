import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpResponse, Style, CustomStyle } from '../../../type/type';
import { OsmDataRequest } from '../../../services/request';

@Injectable({
  providedIn: 'root'
})
export class StyleService extends OsmDataRequest {


  constructor(
    private http_: HttpClient

  ) {
    super(http_)
  }



  /**
   * get all styles of a vector provider
   * @param provider_vector_id number
   * @returns Observable<Style[]>
   */
  getAllStylesOfVectorProvider(provider_vector_id: number): Observable<Style[]> {
    return this.safeGet<Array<Style>>('/api/provider/style/vector/' + provider_vector_id)
  }

  /**
   * update a style
   * @param style FormData
   * @returns Observable<Style>
   */
  updateStyle(style: FormData): Observable<Style> {
    return this.safePut<Style>('/api/provider/style/' + style.get('provider_style_id'), style)
  }

  /**
  * delete a style
  * @param provider_style_id number
  * @returns Observable<Style>
  */
  deleteStyle(provider_style_id: number): Observable<HttpResponse> {
    return this.safeDelete<HttpResponse>('/api/provider/style/' + provider_style_id)
  }

  /**
   * add a style
   * @param style FormData
   * @returns Observable<Style>
   */
  addStyle(style: FormData | Object): Observable<Style> {
    let provider_vector_id
    if (style instanceof FormData) {
      provider_vector_id = style.get('provider_vector_id')
    } else {
      provider_vector_id = style['provider_vector_id']
    }
    return this.safePost<Style>('/api/provider/style/vector/' + provider_vector_id, style)
  }

  /**
  * list all custom styles
  * @returns Observable<Style>
  */
  listCustomStyles(): Observable<CustomStyle[]> {
    return this.safeGet<CustomStyle[]>('/api/provider/style/custom')
  }

  /**
  * list all custom styles of a geometryType
  * @returns Observable<Style>
  */
  listCustomStylesOfGeometryType(geometryType: 'Point' | 'Polygon' | 'LineString' | 'null'): Observable<CustomStyle[]> {
    return this.safeGet<CustomStyle[]>('/api/provider/style/custom?geometry_type=' + geometryType)
  }

}
