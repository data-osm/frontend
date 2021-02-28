import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListGroupThematiqueComponent } from './list-group-thematique.component';

describe('ListGroupThematiqueComponent', () => {
  let component: ListGroupThematiqueComponent;
  let fixture: ComponentFixture<ListGroupThematiqueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListGroupThematiqueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGroupThematiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
