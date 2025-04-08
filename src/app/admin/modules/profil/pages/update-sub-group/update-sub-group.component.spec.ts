import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UpdateSubGroupComponent } from './update-sub-group.component';

describe('UpdateSubGroupComponent', () => {
  let component: UpdateSubGroupComponent;
  let fixture: ComponentFixture<UpdateSubGroupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateSubGroupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateSubGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
