import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { OsmSheetComponent } from './osm-sheet.component';

describe('OsmSheetComponent', () => {
  let component: OsmSheetComponent;
  let fixture: ComponentFixture<OsmSheetComponent>;

  beforeEach(waitForAsync(() => {
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
