import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListGroupComponent } from './list-group.component';

describe('ListGroupComponent', () => {
  let component: ListGroupComponent;
  let fixture: ComponentFixture<ListGroupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListGroupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
