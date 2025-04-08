import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SearchLayerComponent } from './search-layer.component';

describe('SearchLayerComponent', () => {
  let component: SearchLayerComponent;
  let fixture: ComponentFixture<SearchLayerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SearchLayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
