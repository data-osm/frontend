import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchProviderComponent } from './search-provider.component';

describe('SearchProviderComponent', () => {
  let component: SearchProviderComponent;
  let fixture: ComponentFixture<SearchProviderComponent>;

  beforeEach(async(() => {
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
