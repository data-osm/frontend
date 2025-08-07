import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmLoginComponent } from './osm-login.component';

describe('OsmLoginComponent', () => {
  let component: OsmLoginComponent;
  let fixture: ComponentFixture<OsmLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OsmLoginComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OsmLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
