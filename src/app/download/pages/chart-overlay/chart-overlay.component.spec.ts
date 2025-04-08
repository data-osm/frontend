import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChartOverlayComponent } from './chart-overlay.component';

describe('ChartOverlayComponent', () => {
  let component: ChartOverlayComponent;
  let fixture: ComponentFixture<ChartOverlayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChartOverlayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
