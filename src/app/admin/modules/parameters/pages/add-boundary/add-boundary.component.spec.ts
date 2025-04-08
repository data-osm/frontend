import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddBoundaryComponent } from './add-boundary.component';

describe('AddBoundaryComponent', () => {
  let component: AddBoundaryComponent;
  let fixture: ComponentFixture<AddBoundaryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddBoundaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddBoundaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
