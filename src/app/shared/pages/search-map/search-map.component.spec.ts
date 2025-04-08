import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SearchMapComponent } from './search-map.component';

describe('SearchMapComponent', () => {
  let component: SearchMapComponent;
  let fixture: ComponentFixture<SearchMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SearchMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
