import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddGeosignetComponent } from './add-geosignet.component';

describe('AddGeosignetComponent', () => {
  let component: AddGeosignetComponent;
  let fixture: ComponentFixture<AddGeosignetComponent>;

  beforeEach(waitForAsync(() => {
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
