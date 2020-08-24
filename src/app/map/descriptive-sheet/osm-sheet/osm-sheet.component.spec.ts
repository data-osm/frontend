import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmSheetComponent } from './osm-sheet.component';

describe('OsmSheetComponent', () => {
  let component: OsmSheetComponent;
  let fixture: ComponentFixture<OsmSheetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OsmSheetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OsmSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
