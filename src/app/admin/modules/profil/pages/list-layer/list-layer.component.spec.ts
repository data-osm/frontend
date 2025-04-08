import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListLayerComponent } from './list-layer.component';

describe('ListLayerComponent', () => {
  let component: ListLayerComponent;
  let fixture: ComponentFixture<ListLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
