import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SearchProviderComponent } from './search-provider.component';

describe('SearchProviderComponent', () => {
  let component: SearchProviderComponent;
  let fixture: ComponentFixture<SearchProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SearchProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
