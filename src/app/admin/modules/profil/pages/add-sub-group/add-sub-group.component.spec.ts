import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddSubGroupComponent } from './add-sub-group.component';

describe('AddSubGroupComponent', () => {
  let component: AddSubGroupComponent;
  let fixture: ComponentFixture<AddSubGroupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddSubGroupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSubGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
