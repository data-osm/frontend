import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../type/type';
import { OsmDataRequest } from '../../services/request';

@Injectable({
  providedIn: 'root'
})
export class UserService extends OsmDataRequest {


  constructor(
    private http_: HttpClient,
  ) {
    super(http_)

  }


  /**
   * Create new user
   * @param new_user {email:string,password:string}
   * @returns Observable<User>
   */
  createUser(new_user: { email: string, password: string, username: string, is_superuser: boolean, last_name: string }): Observable<User> {
    return this.safePost<User>('/api/account/all-profiles', new_user)
  }

  /**
   * Get list of all users
   * @returns Observable<User[]>
   */
  getAllUsers(): Observable<User[]> {
    return this.safeGet<User[]>('/api/account/all-profiles')
  }
}
