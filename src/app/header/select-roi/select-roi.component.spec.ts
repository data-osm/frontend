import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectRoiComponent } from './select-roi.component';

describe('SelectRoiComponent', () => {
  let component: SelectRoiComponent;
  let fixture: ComponentFixture<SelectRoiComponent>;

  beforeEach(async(() => {
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
