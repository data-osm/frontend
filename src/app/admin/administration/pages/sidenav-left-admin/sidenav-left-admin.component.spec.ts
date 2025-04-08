import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SidenavLeftAdminComponent } from './sidenav-left-admin.component';

describe('SidenavLeftAdminComponent', () => {
  let component: SidenavLeftAdminComponent;
  let fixture: ComponentFixture<SidenavLeftAdminComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SidenavLeftAdminComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidenavLeftAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
