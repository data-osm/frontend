import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapToolsComponent } from './map-tools.component';

describe('MapToolsComponent', () => {
  let component: MapToolsComponent;
  let fixture: ComponentFixture<MapToolsComponent>;

  beforeEach(waitForAsync(() => {
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
