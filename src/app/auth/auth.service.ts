import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, finalize, retry, switchMap, tap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../type/type';
import { of } from 'rxjs/internal/observable/of';
import { getCookie } from './login/csrf.interceptor';
import { OsmDataRequest } from '../services/request';
@Injectable({
  providedIn: 'root'
})
/**
 * Service to manage auth service: Login, logout, store token and refresh token
 */
export class AuthService extends OsmDataRequest {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend

  constructor(
    _http: HttpClient
  ) {
    super(_http)
  }


  /**
   * get user who is connect
   */
  getUserConnect(): Observable<User> {

    return from(this.safeGet('/auth/me/')).pipe(
      map((user: User) => {
        return user
      }),
      catchError((err) => {
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
  login(email: string, pwd: string) {
    return this.safePost('/auth/login/', { email, password: pwd })

  }




}