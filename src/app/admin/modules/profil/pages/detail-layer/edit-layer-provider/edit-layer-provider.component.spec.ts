import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditLayerProviderComponent } from './edit-layer-provider.component';

describe('EditLayerProviderComponent', () => {
  let component: EditLayerProviderComponent;
  let fixture: ComponentFixture<EditLayerProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditLayerProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditLayerProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
