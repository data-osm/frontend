import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AltimetryComponent } from './altimetry.component';

describe('AltimetryComponent', () => {
  let component: AltimetryComponent;
  let fixture: ComponentFixture<AltimetryComponent>;

  beforeEach(async(() => {
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
