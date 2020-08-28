import {MatSnackBar} from '@angular/material/snack-bar';
import {SocialShareComponent} from '../app/social-share/social-share.component'
import { Injectable, ComponentFactoryResolver, ApplicationRef, Injector, EmbeddedViewRef, ComponentRef } from '@angular/core';
import {ListDownloadLayersComponent,downloadDataModelInterface} from '../app/map/sidenav-right/download/list-download-layers/list-download-layers.component'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { modelDescriptiveSheet, DescriptiveSheetComponent } from 'src/app/map/descriptive-sheet/descriptive-sheet.component';
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
      private injector: Injector,
      public dialog: MatDialog,
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
    * Open modal used to display descriptive sheet
    * @param data modelDescriptiveSheet
    * @param size Array<string>|[]
    * @param callBack Function
    */
   openDescriptiveSheetModal(data:modelDescriptiveSheet,size:Array<string>|[],callBack:Function){
     console.log(this.dialog)

    for (let index = 0; index < this.dialog.openDialogs.length; index++) {
      const elementDialog = this.dialog.openDialogs[index];
      if (elementDialog.componentInstance instanceof DescriptiveSheetComponent) {
        elementDialog.close()
      }
    }

    var proprietes:MatDialogConfig = {
      disableClose: false,
      minWidth:400,
      width:'400px',
      data:data,
      hasBackdrop:false,
      position:{
        top:'0px',
        left:window.innerWidth <500 ?'0px':(window.innerWidth/2 - 400/2)+'px'
      }
    }

    if (size.length >0) {
      // proprietes['width']=size[0]
      proprietes['height']=size[1]
    }
    const modal = this.dialog.open(DescriptiveSheetComponent, proprietes);

    modal.afterClosed().subscribe(async (result:any) => {
      callBack(result)
    })
   }


   /**
    * Open modal used to list and download data
    * @param data downloadDataModelInterface[]
    * @param size Array<string>|[]
    * @param callBack Function
    */
   openModalDownloadData(data:downloadDataModelInterface[],size:Array<string>|[],callBack:Function){
    var proprietes = {
      disableClose: false,
      minWidth:400,
      data:data
    }

    if (size.length >0) {
      proprietes['width']=size[0]
      proprietes['height']=size[1]
    }
    const modal = this.dialog.open(ListDownloadLayersComponent, proprietes);

    modal.afterClosed().subscribe(async (result:any) => {
      callBack(result)
    })
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
