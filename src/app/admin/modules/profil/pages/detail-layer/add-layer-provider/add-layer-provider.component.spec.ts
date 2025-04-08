import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddLayerProviderComponent } from './add-layer-provider.component';

describe('AddLayerProviderComponent', () => {
  let component: AddLayerProviderComponent;
  let fixture: ComponentFixture<AddLayerProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddLayerProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddLayerProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
