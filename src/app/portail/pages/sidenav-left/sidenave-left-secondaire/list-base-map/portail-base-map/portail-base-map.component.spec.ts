import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PortailBaseMapComponent } from './portail-base-map.component';

describe('PortailBaseMapComponent', () => {
  let component: PortailBaseMapComponent;
  let fixture: ComponentFixture<PortailBaseMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PortailBaseMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PortailBaseMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
