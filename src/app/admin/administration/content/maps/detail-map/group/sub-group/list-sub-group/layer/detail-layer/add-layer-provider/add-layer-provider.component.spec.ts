import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLayerProviderComponent } from './add-layer-provider.component';

describe('AddLayerProviderComponent', () => {
  let component: AddLayerProviderComponent;
  let fixture: ComponentFixture<AddLayerProviderComponent>;

  beforeEach(async(() => {
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
