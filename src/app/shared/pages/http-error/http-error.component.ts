import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-http-error',
  templateUrl: './http-error.component.html',
  styleUrls: ['./http-error.component.scss']
})
export class HttpErrorComponent implements OnInit {

  @Input()key:string='invalid'
  @Input()form:UntypedFormControl

  constructor() { }

  ngOnInit(): void {
  }


}
