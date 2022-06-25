import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SigFile } from '../../../type/type';

@Injectable({
  providedIn: 'root'
})
export class SigFileService {

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
  * add  new Sig File
  * @param sigFile FormData
  */
  addSigFile(sigFile: FormData):Observable<SigFile> {
    return this.http.post<SigFile>(this.url_prefix + '/api/datasource/sig-file', sigFile, {
      headers: this.get_header(),
    })
  }

  /**
  * add  new Sig File
  * @param sigFile FormData
  */
   updateSigFile(sigFile: FormData):Observable<SigFile>{
    return this.http.put<SigFile>(this.url_prefix + '/api/datasource/sig-file/'+sigFile.get('provider_vector_id'), sigFile, {
      headers: this.get_header(),
    })
  }


  /**
   * Get an SIG file
   * @param provider_vector_id 
   * @returns Observable<SigFile>
   */
  getSigFile(provider_vector_id:number):Observable<SigFile>{
    return this.http.get<SigFile>(this.url_prefix + '/api/datasource/sig-file/'+provider_vector_id, {
      headers: this.get_header(),
    })
  }

}
