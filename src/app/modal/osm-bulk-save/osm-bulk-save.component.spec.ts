import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmBulkSaveComponent } from './osm-bulk-save.component';

describe('OsmBulkSaveComponent', () => {
  let component: OsmBulkSaveComponent;
  let fixture: ComponentFixture<OsmBulkSaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OsmBulkSaveComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OsmBulkSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
