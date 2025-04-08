import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UpdateLayerComponent } from './update-layer.component';

describe('UpdateLayerComponent', () => {
  let component: UpdateLayerComponent;
  let fixture: ComponentFixture<UpdateLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
