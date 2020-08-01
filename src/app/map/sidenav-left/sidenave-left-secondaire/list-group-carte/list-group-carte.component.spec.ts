import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListGroupCarteComponent } from './list-group-carte.component';

describe('ListGroupCarteComponent', () => {
  let component: ListGroupCarteComponent;
  let fixture: ComponentFixture<ListGroupCarteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListGroupCarteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGroupCarteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
