import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildingSheetComponent } from './building-sheet.component';

describe('BuildingSheetComponent', () => {
  let component: BuildingSheetComponent;
  let fixture: ComponentFixture<BuildingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BuildingSheetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuildingSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
