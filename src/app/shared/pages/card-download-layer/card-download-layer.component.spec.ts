import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CardDownloadLayerComponent } from './card-download-layer.component';

describe('CardDownloadLayerComponent', () => {
  let component: CardDownloadLayerComponent;
  let fixture: ComponentFixture<CardDownloadLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CardDownloadLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CardDownloadLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
