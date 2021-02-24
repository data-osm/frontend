import { Component, OnInit, ViewChild } from '@angular/core';
import { cartoHelper } from '../../../helper/carto.helper';
import { manageCompHelper } from '../../../helper/manage-comp.helper';
import { geosignetInterface, geosignets } from './geoSignets'
import { TranslateService } from '@ngx-translate/core';
import {ShContextMenuComponent} from 'ng2-right-click-menu'
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {ListGeosignetComponent} from './list-geosignet/list-geosignet.component'

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
/**
 * Handle context menu stuff
 */
export class ContextMenuComponent implements OnInit {

  /**
   * menu of the context menu
   */
  @ViewChild(ShContextMenuComponent, { static: true }) menu: ShContextMenuComponent;

  /**
   * list of items in the context menu
   */
  listItems = []

  /**
   * coordinates where the concext menu where open
   */
  coordinatesContextMenu:[number,number]

  zoomContextMenu:number

  constructor(
    public translate: TranslateService,
    public manageCompHelper:manageCompHelper,
    public _bottomSheet: MatBottomSheet
  ) {

  }

  ngOnInit(): void {
    this.initialiseContextMenu()
  }

  /**
   * initialise context menu and add it to the map
   */
  initialiseContextMenu() {

    this.translate.get('menu_contextuel', { value: 'caracteristique' }).subscribe((res: any) => {

      // this.listItems[0] = {
      //   name: res.caracteristique,
      //   icon: 1,
      //   click: "this.getInfoOnPoint",
      // };

      this.listItems[0] = {
        name: res.ajouter_geosignet,
        icon: 4,
        click: "this.addGeoSignets",
      };

      this.listItems[1] = {
        name: res.voir_geosignet,
        icon: 5,
        click: "this.listGeoSignets",
      };

    });


  }

  /**
   * Emit when right clik on map
   * @param event MouseEvent
   */
  setRightClickPixel(event:any){
    var coord =new cartoHelper().map.getCoordinateFromPixel([event.layerX, event.layerY]);
    this.coordinatesContextMenu = coord
    this.zoomContextMenu = new cartoHelper().map.getView().getZoom()

  }

  /**
   * call function of a item in context menu
   * @param index number index of the item to call
   */
  callFunction(index,event) {
    // console.log(this.listItems,index)
    var func = this.listItems[index]["click"];

    eval(func + "();");
  }

  /**
   * get information on a npoint
   */
  getInfoOnPoint(){

  }

  /**
   * add a new geo signet
   */
  addGeoSignets(){
    this.manageCompHelper.openModalAddGeosignet([],(nameGeoSignet:string)=>{
      if (nameGeoSignet) {
        new geosignets().addGeoSignet({
          nom:nameGeoSignet,
          coord:this.coordinatesContextMenu,
          zoom:this.zoomContextMenu
        })
      }
    })
  }

  /**
   * list alll geosignets
   */
  listGeoSignets(){
    var allGeoSignets:geosignetInterface[] = new geosignets().getAllGeosignets()
    this._bottomSheet.open(ListGeosignetComponent,{
      data:allGeoSignets
    });
  }

}
