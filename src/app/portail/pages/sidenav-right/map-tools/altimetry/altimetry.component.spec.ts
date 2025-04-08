import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AltimetryComponent } from './altimetry.component';

describe('AltimetryComponent', () => {
  let component: AltimetryComponent;
  let fixture: ComponentFixture<AltimetryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AltimetryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AltimetryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
