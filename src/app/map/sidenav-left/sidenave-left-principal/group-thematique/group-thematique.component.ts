import { Component, OnInit, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { groupThematiqueInterface } from 'src/app/type/type';

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
   * Group thematique
   */
  @Input() groupThematique:groupThematiqueInterface;

  /**
   * Url of the backend
   */
  url_prefix:string = environment.url_prefix

  constructor() { }

  ngOnInit(): void {
  }

}
