import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddLayerComponent } from './add-layer.component';

describe('AddLayerComponent', () => {
  let component: AddLayerComponent;
  let fixture: ComponentFixture<AddLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
