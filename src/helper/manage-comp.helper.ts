import { MatSnackBar } from '@angular/material/snack-bar';
import { SocialShareComponent } from '../app/social-share/social-share.component'
import { Injectable, ComponentFactoryResolver, ApplicationRef, Injector, EmbeddedViewRef, ComponentRef } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AddGeosignetComponent } from '../app/portail/pages/context-menu/add-geosignet/add-geosignet.component'
import { AddStyle, DataForPreview, groupCarteInterface, groupThematiqueInterface, Style, VectorProvider } from '../app/type/type';
import { AddVectorProviderComponent } from '../app/admin/modules/provider/pages/add-vector-provider/add-vector-provider.component';
import {  AddStyleComponent } from '../app/admin/modules/provider/pages/add-style/add-style.component';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../app/modal/confirmation-dialog/confirmation-dialog.component'
import { map } from 'rxjs/internal/operators/map';
import { Observable } from 'rxjs';
import { EditStyleComponent } from '../app/admin/modules/provider/pages/edit-style/edit-style.component';
import { PreviewDataComponent } from '../app/shared/pages/preview-data/preview-data.component';
import * as $ from 'jquery'
import { Map } from 'ol';
import { CartoHelper, layersInMap } from './carto.helper';
import LayerGroup from 'ol/layer/Group';
import { DescriptiveSheetComponent, DescriptiveSheetData } from '../app/portail/pages/descriptive-sheet/descriptive-sheet.component';
/**
 * Open some componenents like social share, loading,modal etc...
 * Dynamically add component in html
 */
@Injectable({
  providedIn: 'root'
})
export class ManageCompHelper {


  constructor(
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
  ) {

  }

  // setComponent(component: string, comp: any) {
  //   if (component == 'SidenaveLeftSecondaireComp') {
  //     this.SidenaveLeftSecondaireComp = comp
  //   }
  // }


  /**
   * Open the snackbar for social sharing
   * @param url string
   * @param durationInSeconds number default to 5s
   */
  openSocialShare(url: string, durationInSeconds: number = 5) {
    this._snackBar.openFromComponent(SocialShareComponent, {
      duration: durationInSeconds * 1000,
      data: { url: url }
    });
  }



  /**
   * Open modal used to display descriptive sheet
   * @param data modelDescriptiveSheet
   * @param size Array<string>|[]
   */
  openDescriptiveSheetModal(data: DescriptiveSheetData, size: Array<string> | []) {

    /**
     * close all modal of type DescriptiveSheetComponent before open another
     */
    let position = {
      top: '60px',
      left: window.innerWidth < 500 ? '0px' : (window.innerWidth / 2 - 400 / 2) + 'px'
    }
    for (let index = 0; index < this.dialog.openDialogs.length; index++) {
      const elementDialog = this.dialog.openDialogs[index];

      if (elementDialog.componentInstance instanceof DescriptiveSheetComponent && document.getElementById(elementDialog.id) && document.getElementById(elementDialog.id).parentElement ) {
            position.top = document.getElementById(elementDialog.id).parentElement.getBoundingClientRect().top + 'px'
            position.left = document.getElementById(elementDialog.id).parentElement.getBoundingClientRect().left + 'px'
          elementDialog.close()
      }
    }

    let proprietes: MatDialogConfig = {
      disableClose: false,
      minWidth: 450,
      maxHeight: 460,
      width: '400px',
      data: data,
      hasBackdrop: false,
      autoFocus: false,
      position: position
    }

    if (size.length > 0) {
      // proprietes['width']=size[0]
      proprietes['height'] = size[1]
    }
    
    return this.dialog.open(DescriptiveSheetComponent, proprietes);
   
  }


  /**
   * Open modal to add geo signet
   * @param size Array<string>|[]
   * @param callBack Function
   */
  openModalAddGeosignet(size: Array<string> | [], callBack: Function) {
    var proprietes = {
      disableClose: false,
      minWidth: 400,
    }

    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    const modal = this.dialog.open(AddGeosignetComponent, proprietes);

    modal.afterClosed().subscribe(async (result: string) => {
      callBack(result)
    })
  }

  /**
* Open modal to add a group icon
* @param size Array<string>|[]
* @param callBack Function
*/
  openModalAddVectorProvider(size: Array<string> | [], callBack: Function) {
    var proprietes = {
      disableClose: false,
      minWidth: 400,
    }

    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    const modal = this.dialog.open(AddVectorProviderComponent, proprietes);

    modal.afterClosed().subscribe((result: VectorProvider) => {
      callBack(result)
    })
  }

  /**
   * Open confirmation dialog
   * @return Observable<boolean>
   */
  openConfirmationDialog(size: Array<string> | [], confirmationDialogData:ConfirmationDialogData):Observable<boolean>{

    let proprietes = {
      minWidth:400,
      disableClose:true,
      data:confirmationDialogData
    }
    
    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    
    const modal = this.dialog.open(ConfirmationDialogComponent, proprietes);
  
    return modal.afterClosed().pipe(
      map((value:boolean)=>value)
    )
  }

  /**
   * Open add style dialog
   * @return Observable<boolean>
   */
  openAddStyleDialog(size: Array<string> | [], data:AddStyle):Observable<Style>{

    let proprietes = {
      minWidth:400,
      disableClose:true,
      data:data
    }
    
    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    
    const modal = this.dialog.open<AddStyleComponent, AddStyle, Style>(AddStyleComponent, proprietes);
  
    return modal.afterClosed()
  }

  /**
   * open edit style dialog 
   * @param Style style
   * @return Observable<boolean>
   */
  openUpdateStyleDialog(size:Array<string> | [], style:Style):Observable<boolean>{
    let proprietes = {
      minWidth:400,
      disableClose:true,
      data:style
    }
    
    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    
    const modal = this.dialog.open(EditStyleComponent, proprietes);
  
    return modal.afterClosed().pipe(
      map((value:boolean)=>value)
    )
  }

  /**
   * Open preview data dialog
   * @param Array<DataForPreview> data 
   */
  openDataPreviewDialog(size:Array<string> | [], data:Array<DataForPreview>){
    let proprietes:MatDialogConfig= {
      minWidth:400,
      disableClose:false,
      width:($( window ).width()-200)+'px',
      maxWidth:($( window ).width()-200)+'px',
      height:($( window ).height() -150)+'px',
      maxHeight:($( window ).height() -150)+'px',
      data:data
    }
    
    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }

    const modal = this.dialog.open(PreviewDataComponent, proprietes);

  }


}

