import { Component, OnInit, ViewChild, NgZone, Inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { FormGroup, FormControl, UntypedFormBuilder, FormArray, Validators } from '@angular/forms';
import * as $ from 'jquery';
import {geosignetInterface,geosignets} from '../geoSignets'
import { Map } from 'ol';

@Component({
  selector: 'app-list-geosignet',
  templateUrl: './list-geosignet.component.html',
  styleUrls: ['./list-geosignet.component.scss']
})
/**
 * Bottom sheet that list all geosignet existing in localstorage
 */
export class ListGeosignetComponent implements OnInit {

  /**
   * List of all signets
   */
  signets:geosignetInterface[] = []
  typeButton

  constructor(
    private bottomSheetRef: MatBottomSheetRef<ListGeosignetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: {map:Map, signets: geosignetInterface[]},
    private ngZone: NgZone,
    private builder: UntypedFormBuilder
  ) { }


  openLink(event: MouseEvent): void {
    this.bottomSheetRef.dismiss();
    event.preventDefault();
    console.log(event)
  }

   ngOnInit() {

    	this.signets = this.data.signets

    }

    /**
     * emit when user select a geosignet
     * @param id number
     */
    select(id){
      new geosignets(this.data.map).goToAGeosignet(id)
      this.bottomSheetRef.dismiss();
    }


}
