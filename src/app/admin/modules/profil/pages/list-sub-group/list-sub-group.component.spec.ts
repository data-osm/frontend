import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListSubGroupComponent } from './list-sub-group.component';

describe('ListSubGroupComponent', () => {
  let component: ListSubGroupComponent;
  let fixture: ComponentFixture<ListSubGroupComponent>;

  beforeEach(waitForAsync(() => {
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
