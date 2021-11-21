import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSubGroupComponent } from './list-sub-group.component';

describe('ListSubGroupComponent', () => {
  let component: ListSubGroupComponent;
  let fixture: ComponentFixture<ListSubGroupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListSubGroupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListSubGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
