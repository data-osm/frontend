import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VectorProvider } from '../../type/type';
import { CountFeature } from '../models/download';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class DownloadService extends OsmDataRequest {



  constructor(
    private http_: HttpClient,
  ) {
    super(http_)

  }



  /**
   * count layers in one adminBoundary
   * @param adminBoundary AdminBoundary
   * @returns Observable<any>
   */
  countFeaturesInAdminBoundary(layer_ids: Array<number>, provider_vector_id?: number, table_id?: number): Observable<CountFeature[]> {
    return this.safePost<CountFeature[]>('/api/group/count', {
      layer_ids: layer_ids,
      provider_vector_id: provider_vector_id,
      table_id: table_id
    })
  }

}
