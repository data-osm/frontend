import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Icon, TagsIcon } from '../../../type/type';
import { NotifierService } from 'angular-notifier';
import { OsmDataRequest } from '../../../services/request';
@Injectable({
  providedIn: 'root'
})
/**
 * get all icons, group of icons, add icons, edit, delete it
 */
export class IconService extends OsmDataRequest {

  private readonly notifier: NotifierService;

  constructor(
    private http_: HttpClient,
    notifierService: NotifierService,

  ) {
    super(http_)
    this.notifier = notifierService;

  }



  /**
   * get all icons group by category
   * @returns Observable<string[]>
   */
  getIconsGroupByCategory(): Observable<Array<{ [key: string]: Icon[] }>> {
    return this.safeGet<Array<{ [key: string]: Icon[] }>>('/api/group/icons')
  }


  /**
   * add  icon
   * @param Icon 
   */
  uploadIcon(icon: FormData): Observable<Icon> {
    //{ reportProgress: true, observe: 'events' }
    return this.safePost<Icon>('/api/group/icons', icon).pipe(
      // map((value): Icon => { return value.body })
    )
  }

  /**
 * update  icon
 * @param Icon 
 */
  updateIcon(icon: FormData) {
    return this.safePut('/api/group/icons/' + icon.get('icon_id'), icon)
  }

  /**
   * delete icon by id
   * @param icon_id number
   */
  deleteIcon(icon_id: number): Observable<Icon> {
    return this.safeDelete<Icon>('/api/group/icons/' + icon_id)
  }

  /**
   * Get icon by id
   * @param icon_id number
   */
  getIcon(icon_id: number): Observable<Icon> {
    return this.safeGet<Icon>('/api/group/icons/' + icon_id)
  }

  /**
   * Search a tag
   * @param search_word string
   * @returns Observable<Array<Tag>>
   */
  searchIconTags(search_word: string): Observable<Array<TagsIcon>> {
    return this.safePost<Array<TagsIcon>>('/api/group/icons/tags/search', { search_word: search_word })
  }

  /**
   * Search an icon
   * @param search_word string
   */
  searchIcon(search_word: string): Observable<Icon[]> {
    //{  reportProgress: true, observe: 'events' }
    return from(this.safePost('/api/group/icons/search', { 'search_word': search_word }).pipe(
      map((value: HttpResponse<any>): Icon[] => { return value.body })
    ))
  }

  /**
* Make a get request to Backend
* @param string path url
*/
  getRequest(path: string): Promise<any> {
    let promise = new Promise((resolve, reject) => {
      this.safeGet(path)
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
   * load svg content
   * @param svgPath string
   */
  loadSvgContent(svgPath: string): Observable<string> {

    svgPath = svgPath.replace(this.urlPrefix, '')
    return this.safeGet(
      svgPath, 'text'
    )
  }

}
