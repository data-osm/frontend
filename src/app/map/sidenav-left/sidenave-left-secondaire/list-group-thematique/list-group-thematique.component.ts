import { Component, OnInit, Input } from '@angular/core';
import { groupThematiqueInterface } from 'src/app/type/type';

@Component({
  selector: 'app-list-group-thematique',
  templateUrl: './list-group-thematique.component.html',
  styleUrls: ['./list-group-thematique.component.scss']
})
/**
 * List contents of a group thematique
 */
export class ListGroupThematiqueComponent implements OnInit {

  /**
   * Group thematique to display
   */
  @Input() groupThematique:groupThematiqueInterface

  constructor() { }

  ngOnInit(): void {
  }

}
