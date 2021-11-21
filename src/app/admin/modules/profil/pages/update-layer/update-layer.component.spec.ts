import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateLayerComponent } from './update-layer.component';

describe('UpdateLayerComponent', () => {
  let component: UpdateLayerComponent;
  let fixture: ComponentFixture<UpdateLayerComponent>;

  beforeEach(async(() => {
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
