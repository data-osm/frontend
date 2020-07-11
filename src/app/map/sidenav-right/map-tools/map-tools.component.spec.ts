import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapToolsComponent } from './map-tools.component';

describe('MapToolsComponent', () => {
  let component: MapToolsComponent;
  let fixture: ComponentFixture<MapToolsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapToolsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
