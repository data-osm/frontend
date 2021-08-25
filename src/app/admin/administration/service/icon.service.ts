import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Icon, TagsIcon } from '../../../type/type';
import { NotifierService } from 'angular-notifier';
@Injectable({
  providedIn: 'root'
})
/**
 * get all icons, group of icons, add icons, edit, delete it
 */
export class IconService {

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
   * get all icons group by category
   * @returns Observable<string[]>
   */
  getIconsGroupByCategory(): Observable<Array<{[key: string]: Icon[]}>> {
    return this.http.get<Array<{[key: string]: Icon[]}> >(this.url_prefix +'/api/group/icons', {headers: this.get_header()})
  }
  

  /**
   * add  icon
   * @param Icon 
   */
  uploadIcon(icon: FormData):Observable<Icon> {
    return from(this.http.post<Icon>(this.url_prefix + '/api/group/icons/add', icon, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>): Icon => { return value.body })
    ))
  }

    /**
   * update  icon
   * @param Icon 
   */
  updateIcon(icon: FormData) {
    return this.http.put(this.url_prefix + '/api/group/icons/'+icon.get('icon_id'), icon, { headers: this.get_header()})
  }

  /**
   * delete icon by id
   * @param icon_id number
   */
  deleteIcon(icon_id:number):Observable<Icon>{
    return this.http.delete<Icon>(this.url_prefix+'/api/group/icons/'+icon_id, {headers: this.get_header()})
  }

  /**
   * Get icon by id
   * @param icon_id number
   */
  getIcon(icon_id:number):Observable<Icon>{
    return this.http.get<Icon>(this.url_prefix+'/api/group/icons/'+icon_id, {headers: this.get_header()})
  }

  /**
   * Search a tag
   * @param search_word string
   * @returns Observable<Array<Tag>>
   */
  searchIconTags(search_word:string):Observable<Array<TagsIcon>>{
    return this.http.post<Array<TagsIcon>>(this.url_prefix+'/api/group/icons/tags/search',{search_word:search_word}, { headers: this.get_header() })
  }

  /**
   * Search an icon
   * @param search_word string
   */
  searchIcon(search_word: string): Observable<Icon[]> {
    return from(this.http.post(this.url_prefix + '/api/group/icons/search', { 'search_word': search_word }, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>): Icon[] => { return value.body })
    ))
  }

  /**
* Make a get request to Backend
* @param string path url
*/
  getRequest(path: string): Promise<any> {
    let promise = new Promise((resolve, reject) => {
      this.http.get(this.url_prefix + path, { headers: this.get_header() })
        .toPromise()
        .then(
          res => {
            resolve(res);
          },
          msg => { // Error
            reject(msg);
          }
        );
    });

    return promise;
  }


  /**
   * Make a Post request to Backend
   * @param string path url
   * @param Object data
   */
  post_requete(url: string, data: any): Promise<any> {
    console.log(data)
    return new Promise((resolve, reject) => {
      this.http.post(this.url_prefix + url, data, {
        headers: this.get_header(), reportProgress: true,
        observe: 'events'
      })
        .toPromise()
        .then(
          res => {
            resolve(res);
          },
          msg => { // Error

            reject(msg.error);
          }
        );
    });
  }

  /**
   * load svg content
   * @param svgPath string
   */
  loadSvgContent(svgPath: string): Observable<string> {
    svgPath = svgPath.replace(this.url_prefix,'')
    return this.http.get(
      this.url_prefix + svgPath, {
      responseType: 'text'
    }
    )
  }

}
