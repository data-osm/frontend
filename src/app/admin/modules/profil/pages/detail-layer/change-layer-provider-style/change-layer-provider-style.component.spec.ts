import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChangeLayerProviderStyleComponent } from './change-layer-provider-style.component';

describe('ChangeLayerProviderStyleComponent', () => {
  let component: ChangeLayerProviderStyleComponent;
  let fixture: ComponentFixture<ChangeLayerProviderStyleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangeLayerProviderStyleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeLayerProviderStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
