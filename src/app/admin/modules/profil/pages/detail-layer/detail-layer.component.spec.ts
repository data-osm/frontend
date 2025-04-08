import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DetailLayerComponent } from './detail-layer.component';

describe('DetailLayerComponent', () => {
  let component: DetailLayerComponent;
  let fixture: ComponentFixture<DetailLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
