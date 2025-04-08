import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditSubGroupComponent } from './edit-sub-group.component';

describe('EditSubGroupComponent', () => {
  let component: EditSubGroupComponent;
  let fixture: ComponentFixture<EditSubGroupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditSubGroupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditSubGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
