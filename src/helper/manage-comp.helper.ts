import {MatSnackBar} from '@angular/material/snack-bar';
import {SocialShareComponent} from '../app/social-share/social-share.component'
import { Injectable, ComponentFactoryResolver, ApplicationRef, Injector, EmbeddedViewRef, ComponentRef } from '@angular/core';
/**
 * Open some componenents like social share, loading,modal etc...
 * Dynamically add component in html
 */
@Injectable({
  providedIn: 'root'
})
 export class manageCompHelper{

   constructor(
     private _snackBar: MatSnackBar,
     private componentFactoryResolver: ComponentFactoryResolver,
      private appRef: ApplicationRef,
      private injector: Injector
     ){

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

   /**
    * Create a component with attributes
    * @see https://gist.github.com/reed-lawrence/1f6b7c328ad3886e60dc2b0adcf75a97
    * @param component any
    * @param componentProps object
    */
   createComponent(component: any, componentProps?: object) {
    // 1. Create a component reference from the component
    const componentRef = this.componentFactoryResolver
      .resolveComponentFactory(component)
      .create(this.injector);

    if (componentProps && typeof componentRef.instance === 'object') {
      Object.assign(componentRef.instance as object, componentProps);
    }
    console.log(componentRef.instance)
    return componentRef;
  }

  /**
   * append a component create dynnamically to an Element
   * @see https://gist.github.com/reed-lawrence/1f6b7c328ad3886e60dc2b0adcf75a97
   * @param componentRef ComponentRef<unknown>
   * @param appendTo Element
   */
  appendComponent(componentRef: ComponentRef<unknown>, appendTo: Element) {
    // 2. Attach component to the appRef so that it's inside the ng component tree
    this.appRef.attachView(componentRef.hostView);

    // 3. Get DOM element from component
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>)
      .rootNodes[0] as HTMLElement;

    // 4. Append DOM element to the body
    appendTo.appendChild(domElem);

    return;
  }

 }
