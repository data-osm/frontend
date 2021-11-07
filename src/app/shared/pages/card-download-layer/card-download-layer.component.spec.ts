import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDownloadLayerComponent } from './card-download-layer.component';

describe('CardDownloadLayerComponent', () => {
  let component: CardDownloadLayerComponent;
  let fixture: ComponentFixture<CardDownloadLayerComponent>;

  beforeEach(async(() => {
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
