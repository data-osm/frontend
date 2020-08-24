import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptiveSheetComponent } from './descriptive-sheet.component';

describe('DescriptiveSheetComponent', () => {
  let component: DescriptiveSheetComponent;
  let fixture: ComponentFixture<DescriptiveSheetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DescriptiveSheetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DescriptiveSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
