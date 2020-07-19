import {MatSnackBar} from '@angular/material/snack-bar';
import {SocialShareComponent} from '../app/social-share/social-share.component'
import { Injectable } from '@angular/core';
/**
 * Open some componenents like social share, loading,modal etc...
 */
@Injectable({
  providedIn: 'root'
})
 export class manageCompHelper{

   constructor(private _snackBar: MatSnackBar){

   }

   /**
    * Open the snackbar for social sharing
    * @param url string
    * @param durationInSeconds number default to 5s
    */
    openSocialShare(url:string,durationInSeconds:number=5){
    this._snackBar.openFromComponent(SocialShareComponent, {
      duration: durationInSeconds * 1000,
      data:{url:url}
    });
   }

 }
