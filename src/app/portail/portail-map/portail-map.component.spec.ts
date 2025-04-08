import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PortailMapComponent } from './portail-map.component';

describe('PortailMapComponent', () => {
  let component: PortailMapComponent;
  let fixture: ComponentFixture<PortailMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PortailMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PortailMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
