import { Component, OnInit, Input } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
import { groupCarteInterface } from '../../../../../type/type';

@Component({
  selector: 'app-group-carte',
  templateUrl: './group-carte.component.html',
  styleUrls: ['./group-carte.component.scss']
})
/**
 * Display group of a carte
 */
export class GroupCarteComponent implements OnInit {

  /**
   * group carte
   */
  @Input() groupeCarte:groupCarteInterface;

  /**
   * Url of the backend
   */
  url_prefix:string = environment.backend

  constructor() { }

  ngOnInit(): void {
  }

}
