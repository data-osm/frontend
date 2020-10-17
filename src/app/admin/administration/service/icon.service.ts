import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Icon } from '../../../type/type';
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
  /**
   * list of icons, group by category
   */
  public iconList: BehaviorSubject<{
    [key: string]: Icon[];
  }> = new BehaviorSubject(undefined)

  public iconListLoadError: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(
    private http: HttpClient,
    notifierService: NotifierService,

  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.notifier = notifierService;

    this.fetchAndStoreListIcons()
  }

  fetchAndStoreListIcons() {
    this.iconList.next(undefined)
    this.getIconsGroupByCategory().pipe(
      catchError((err) => { this.notifier.notify("error", "An error occured while loading icons"); throw new Error(err); }),
      // finalize(()=>{this.loading=false})
    ).subscribe(
      (response: {
        [key: string]: Icon[];
      }) => {
        this.iconList.next(response)
        this.iconListLoadError.next(false)
      }, (error) => {
        this.iconListLoadError.next(true)
      }
    )
  }

  /**
   * get list of all icons
   */
  getAllIconsFromCategory(category:string):Array<Icon>{
    let allIcons:Array<Icon>= []

    if (this.iconList.getValue() != undefined){
      for (const key in this.iconList.getValue()) {
        if (this.iconList.getValue().hasOwnProperty.call(this.iconList.getValue(), key) && key==category) {
          allIcons = this.iconList.getValue()[key]
        }
      }

    }
    return allIcons

  }

    /**
   * get list of all icons
   */
  getCategoryIcons():Array<string>{
    let allIcons:Array<string>= []

    if (this.iconList.getValue() != undefined) {
      for (const key in this.iconList.getValue()) {
        if (this.iconList.getValue().hasOwnProperty.call(this.iconList.getValue(), key)) {
          allIcons.push(key)
        }
      }

    }

    return allIcons

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
  getIconsGroupByCategory(): Observable<{
    [key: string]: Icon[]
  }> {
    return from(this.getRequest('/api/group/icons')).pipe(
      map((result: {
        [key: string]: Icon[]
      }) => {
        return result
      }),
      catchError((err) => {
        throw new Error(err);
      })
    )
  }

  /**
   * add  icon
   * @param group 
   */
  uploadIcon(icon: any) {
    return from(this.http.post(this.url_prefix + '/api/group/icons/add', icon, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>) => { return value.body })
    ))
    // return from(this.post_requete('api/group/icons/add',icon))
  }

  /**
   * Search an icon
   * @param search_word string
   */
  searchIcon(search_word:string):Observable<Icon[]>{
    return from(this.http.post(this.url_prefix + '/api/group/icons/search', {'search_word':search_word}, { headers: this.get_header(), reportProgress: true, observe: 'events' }).pipe(
      map((value: HttpResponse<any>):Icon[] => { return value.body })
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

}
