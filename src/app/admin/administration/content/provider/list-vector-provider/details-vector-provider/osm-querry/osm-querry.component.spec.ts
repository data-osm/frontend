import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmQuerryComponent } from './osm-querry.component';

describe('OsmQuerryComponent', () => {
  let component: OsmQuerryComponent;
  let fixture: ComponentFixture<OsmQuerryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OsmQuerryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OsmQuerryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
