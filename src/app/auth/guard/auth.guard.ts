import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { User } from '../../type/type';
import {AuthService} from '../auth.service'

@Injectable({
  providedIn: 'root'
})
/**
 * A user is connect ?
 */
export class AuthGuard implements CanActivate {
  constructor(
    public AuthService:AuthService,
    private router: Router
    ){

  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return new Promise((resolve) => {
      this.AuthService.getUserConnect().pipe().subscribe(
        (user:User)=>{
          resolve(true)
        },
        (err)=>{
          this.router.navigate(['login']) 
          resolve(false)
        }
      )
    })
  }
  
}
