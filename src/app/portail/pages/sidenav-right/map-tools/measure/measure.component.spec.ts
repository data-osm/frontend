import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MeasureComponent } from './measure.component';

describe('MesureComponent', () => {
  let component: MeasureComponent;
  let fixture: ComponentFixture<MeasureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MeasureComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeasureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
