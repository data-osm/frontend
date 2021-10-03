import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchAdminBoundaryComponent } from './search-admin-boundary.component';

describe('SearchAdminBoundaryComponent', () => {
  let component: SearchAdminBoundaryComponent;
  let fixture: ComponentFixture<SearchAdminBoundaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SearchAdminBoundaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchAdminBoundaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
