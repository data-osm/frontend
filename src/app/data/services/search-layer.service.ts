import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Layer } from '../../type/type';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class SearchLayerService extends OsmDataRequest {


  constructor(
    private http_: HttpClient,
  ) {
    super(http_)

  }


  searchLayer(querry: string): Observable<Layer[]> {
    return this.safeGet<Layer[]>('/api/group/layer/search?search=' + querry)
  }
}
