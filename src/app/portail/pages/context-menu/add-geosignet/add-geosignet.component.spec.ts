import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGeosignetComponent } from './add-geosignet.component';

describe('AddGeosignetComponent', () => {
  let component: AddGeosignetComponent;
  let fixture: ComponentFixture<AddGeosignetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddGeosignetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddGeosignetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
