import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../type/type';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  headers: HttpHeaders = new HttpHeaders({});
  url_prefix = environment.backend

  constructor(
    private http: HttpClient,
  ) {
    this.headers.append('Content-Type', 'application/x-www-form-urlencoded');
    this.headers.append('Content-Type', 'application/json');

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
   * Create new user
   * @param new_user {email:string,password:string}
   * @returns Observable<User>
   */
  createUser(new_user:{email:string,password:string,username:string}):Observable<User> {
    return this.http.post<User>(this.url_prefix+'/auth/users/',new_user, {headers: this.get_header()})
  }

  /**
   * Get list of all users
   * @returns Observable<User[]>
   */
  getAllUsers():Observable<User[]>{
    return this.http.get<User[]>(this.url_prefix+'/api/account/all-profiles', {headers: this.get_header()})
  }
}
