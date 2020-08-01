import { Component, OnInit, Input } from '@angular/core';
import { groupCarteInterface } from 'src/app/type/type';

@Component({
  selector: 'app-list-group-carte',
  templateUrl: './list-group-carte.component.html',
  styleUrls: ['./list-group-carte.component.scss']
})
/**
 * List contents of a group cartes
 */
export class ListGroupCarteComponent implements OnInit {

  /**
   * Group carte to display
   */
  @Input() groupCarte:groupCarteInterface

  constructor() { }

  ngOnInit(): void {
  }

}
