import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
import { Group } from '../../../../../type/type';
import { FormControl } from '@angular/forms';
import { MapsService } from '../../../../../data/services/maps.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  @Input() group: Group
  @Output() delete: EventEmitter<Group> = new EventEmitter()
  @Output() update: EventEmitter<Group> = new EventEmitter()
  @Output() open: EventEmitter<Group> = new EventEmitter()


  environment = environment

  constructor(
    private mapService: MapsService
  ) { }

  ngOnInit(): void {
  }

  setGroupPrincipal() {
    this.mapService.setGroupPrincipal(this.group).pipe(
      take(1)
    ).subscribe()
  }

}
