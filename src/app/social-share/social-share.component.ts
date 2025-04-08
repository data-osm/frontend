import { Component, OnInit, Input, Inject } from '@angular/core';
import {MAT_LEGACY_SNACK_BAR_DATA as MAT_SNACK_BAR_DATA} from '@angular/material/legacy-snack-bar';

/**
 * Component for share tuff
 */
@Component({
  selector: 'app-social-share',
  templateUrl: './social-share.component.html',
  styleUrls: ['./social-share.component.scss']
})
export class SocialShareComponent implements OnInit {

  /**
   * Url to share
   */
  url:string
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: {url:string}) { }

  ngOnInit(): void {
    this.url = this.data.url
  }

}
