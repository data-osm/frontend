import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Group } from '../../type/type';


@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  
  private active_group$ = new BehaviorSubject<Group>(null);
  selected_active_group$ = this.active_group$.asObservable();

  constructor() { }

  setActiveGroup(active_group: Group) {
    this.active_group$.next(active_group);
  }

}
