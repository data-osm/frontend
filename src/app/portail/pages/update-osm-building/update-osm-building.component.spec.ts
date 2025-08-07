import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateOsmBuildingComponent } from './update-osm-building.component';

describe('UpdateOsmBuildingComponent', () => {
  let component: UpdateOsmBuildingComponent;
  let fixture: ComponentFixture<UpdateOsmBuildingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateOsmBuildingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateOsmBuildingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
