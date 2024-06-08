import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-http-error',
  templateUrl: './http-error.component.html',
  styleUrls: ['./http-error.component.scss']
})
export class HttpErrorComponent implements OnInit {

  @Input()key:string='invalid'
  @Input()form:FormControl

  constructor() { }

  ngOnInit(): void {
  }


}
