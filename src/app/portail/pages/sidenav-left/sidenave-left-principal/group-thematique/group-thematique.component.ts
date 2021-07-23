import { Component, OnInit, Input } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
import { Group } from '../../../../../type/type';

@Component({
  selector: 'app-group-thematique',
  templateUrl: './group-thematique.component.html',
  styleUrls: ['./group-thematique.component.scss']
})
/**
 * Display group of a thematique
 */
export class GroupThematiqueComponent implements OnInit {

  /**
   * Group
   */
  @Input() group:Group;

  /**
   * Url of the backend
   */
   environment = environment

  constructor() { }

  ngOnInit(): void {
  }

}
