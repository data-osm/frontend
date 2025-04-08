import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListGroupThematiqueComponent } from './list-group-thematique.component';

describe('ListGroupThematiqueComponent', () => {
  let component: ListGroupThematiqueComponent;
  let fixture: ComponentFixture<ListGroupThematiqueComponent>;

  beforeEach(waitForAsync(() => {
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
