import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SigFile } from '../../../type/type';
import { OsmDataRequest } from '../../../services/request';

@Injectable({
  providedIn: 'root'
})
export class SigFileService extends OsmDataRequest {

  private readonly notifier: NotifierService;

  constructor(
    private http_: HttpClient,
    notifierService: NotifierService,

  ) {
    super(http_)
    this.notifier = notifierService;

  }



  /**
  * add  new Sig File
  * @param sigFile FormData
  */
  addSigFile(sigFile: FormData): Observable<SigFile> {
    return this.safePost<SigFile>('/api/datasource/sig-file', sigFile)
  }

  /**
  * add  new Sig File
  * @param sigFile FormData
  */
  updateSigFile(sigFile: FormData): Observable<SigFile> {
    return this.safePut<SigFile>('/api/datasource/sig-file/' + sigFile.get('provider_vector_id'), sigFile)
  }


  /**
   * Get an SIG file
   * @param provider_vector_id 
   * @returns Observable<SigFile>
   */
  getSigFile(provider_vector_id: number): Observable<SigFile> {
    return this.safeGet<SigFile>('/api/datasource/sig-file/' + provider_vector_id)
  }

}
