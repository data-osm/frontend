import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SelectRoiComponent } from './select-roi.component';

describe('SelectRoiComponent', () => {
  let component: SelectRoiComponent;
  let fixture: ComponentFixture<SelectRoiComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectRoiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectRoiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
