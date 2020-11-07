import { MatSnackBar } from '@angular/material/snack-bar';
import { SocialShareComponent } from '../app/social-share/social-share.component'
import { Injectable, ComponentFactoryResolver, ApplicationRef, Injector, EmbeddedViewRef, ComponentRef } from '@angular/core';
import { ListDownloadLayersComponent, downloadDataModelInterface } from '../app/map/sidenav-right/download/list-download-layers/list-download-layers.component'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { modelDescriptiveSheet, DescriptiveSheetComponent } from 'src/app/map/descriptive-sheet/descriptive-sheet.component';
import { layersInMap, cartoHelper } from './carto.helper';
import { LayerGroup } from 'src/app/ol-module';
import { InfoComponent } from 'src/app/modal/info/info.component'
import { AddGeosignetComponent } from 'src/app/map/context-menu/add-geosignet/add-geosignet.component'
import { SidenaveLeftSecondaireComponent } from 'src/app/map/sidenav-left/sidenave-left-secondaire/sidenave-left-secondaire.component'
import { groupCarteInterface, groupThematiqueInterface } from '../app/type/type';
import { AddIconComponent } from '../app/admin/administration/content/icons/add-icon/add-icon.component';
import { AddVectorProviderComponent } from '../app/admin/administration/content/provider/add-vector-provider/add-vector-provider.component';

/**
 * Open some componenents like social share, loading,modal etc...
 * Dynamically add component in html
 */
@Injectable({
  providedIn: 'root'
})
export class manageCompHelper {

  SidenaveLeftSecondaireComp: SidenaveLeftSecondaireComponent

  constructor(
    private _snackBar: MatSnackBar,
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
    public dialog: MatDialog,
  ) {

  }

  setComponent(component: string, comp: any) {
    if (component == 'SidenaveLeftSecondaireComp') {
      this.SidenaveLeftSecondaireComp = comp
    }
  }

  /**
  * Open group thematique slide
  * @param groupThematique groupThematiqueInterface
  */
  openGroupThematiqueSlide(groupThematique: groupThematiqueInterface) {
    this.SidenaveLeftSecondaireComp.setGroupThematique(groupThematique)
    this.SidenaveLeftSecondaireComp.open()
  }

  /**
   * Open group carte slide
   * @param groupCarte groupCarteInterface
   */
  openGroupCarteSlide(groupCarte: groupCarteInterface) {
    this.SidenaveLeftSecondaireComp.setGroupCarte(groupCarte)
    this.SidenaveLeftSecondaireComp.open()
  }


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
   * Open descriptive sheet
   * @param type string descriptionSheetCapabilities of the layer ( will be use for the type of the descriptiove sheet)
   * @param layer layersInMap
   * @param coordinates_3857 [number,number] coordinates on the geometry of the feature
   * @param geometry Geometry the geometry if exist
   * @param properties any properties to display if exist
   */
  openDescriptiveSheet(type: string, layer: layersInMap, coordinates_3857: [number, number], geometry?: any, properties?: any) {
    if (type) {

      if (layer.layer instanceof LayerGroup) {
        layer.layer = new cartoHelper().getLayerQuerryBleInLayerGroup(layer.layer)
      }
      this.openDescriptiveSheetModal({
        type: type,
        layer: layer,
        properties: properties,
        geometry: geometry,
        coordinates_3857: coordinates_3857
      }, [], () => {

      })

    }
  }

  /**
   * Open modal used to display descriptive sheet
   * @param data modelDescriptiveSheet
   * @param size Array<string>|[]
   * @param callBack Function
   */
  openDescriptiveSheetModal(data: modelDescriptiveSheet, size: Array<string> | [], callBack: Function) {

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
    const modal = this.dialog.open(DescriptiveSheetComponent, proprietes);

    modal.afterClosed().subscribe(async (result: any) => {
      callBack(result)
    })
  }


  /**
   * Open modal used to list and download data
   * @param data downloadDataModelInterface[]
   * @param size Array<string>|[]
   * @param callBack Function
   */
  openModalDownloadData(data: downloadDataModelInterface[], size: Array<string> | [], callBack: Function) {
    var proprietes = {
      disableClose: false,
      minWidth: 400,
      data: data
    }

    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    const modal = this.dialog.open(ListDownloadLayersComponent, proprietes);

    modal.afterClosed().subscribe(async (result: any) => {
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

  /**
    * Open modal info of the app
    * @param size Array<string>|[]
    * @param callBack Function
    */
  openModalInfo(size: Array<string> | []) {
    var proprietes = {
      disableClose: false,
      minWidth: 400,
    }

    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    const modal = this.dialog.open(InfoComponent, proprietes);

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
  openModalAddcon(size: Array<string> | [], callBack: Function) {
    var proprietes = {
      disableClose: false,
      minWidth: 400,
    }

    if (size.length > 0) {
      proprietes['width'] = size[0]
      proprietes['height'] = size[1]
    }
    const modal = this.dialog.open(AddIconComponent, proprietes);

    modal.afterClosed().subscribe((result: boolean) => {
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

    modal.afterClosed().subscribe((result: boolean) => {
      callBack(result)
    })
  }



}

