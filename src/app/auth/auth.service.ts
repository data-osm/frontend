import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject,from } from 'rxjs';
import { catchError, finalize, retry, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../type/type';
import { of } from 'rxjs/internal/observable/of';
@Injectable({
  providedIn: 'root'
})
/**
 * Service to manage auth service: Login, logout, store token and refresh token
 */
export class AuthService {

  headers: HttpHeaders = new HttpHeaders({});
  headers_nodejs: Headers = new Headers({});
  url_prefix = environment.backend

  constructor(
    private http: HttpClient
  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');
    this.headers_nodejs.append('Content-Type', 'application/json');
  }

  /**
   * Get header
   */
  get_header() {
    this.headers = this.headers.set('Authorization', 'Bearer  ' + localStorage.getItem('token'))
    return this.headers
  }

  /**
   * Store token and refresh token
   * @param token string
   * @param refresh string
   */
  storeToken(token:string,refresh?:string){
    localStorage.setItem('token',token)
    if (refresh) {
        localStorage.setItem('refresh',refresh)
    }
  }

  /**
   * get user who is connect
   */
  getUserConnect():Observable<User>{

    return from(this.getRequest('/auth/users/me/')).pipe(
        map((user:User)=>{
            return user
        }),
        catchError((err)=>{
            throw new Error(err);
        })
    )
  }

  /**
   * Login a user and store his tokens
   * @param email 
   * @param pwd 
   * @returns boolean 
   */
  login(email:string,pwd:string):Promise<{ error: boolean, msg?: string }> {
    return new Promise((resolve, reject) => {
        
        from(this.post_requete('/auth/jwt/create/',{
            email:email,
            password:pwd
        })).pipe(
            catchError((err) => {
                resolve({
                  error: true,
                  msg: ''
                })
                // return ''
                throw new Error(err);
                
              })
        ).subscribe(
            (credentials:{
                access:string,
                refresh:string
            })=>{
                this.storeToken(credentials.access,credentials.refresh)
                resolve({
                    error: false
                  })
            },
            (err)=>{
                reject({
                    resolve: true
                  })
            }
        )

    })
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
  post_requete(url: string, data: Object): Promise<any> {

    return new Promise((resolve, reject) => {
      this.http.post(this.url_prefix + url, data, { headers: this.get_header() })
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