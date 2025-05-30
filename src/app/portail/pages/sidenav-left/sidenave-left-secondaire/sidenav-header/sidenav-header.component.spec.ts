import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SidenavHeaderComponent } from './sidenav-header.component';

describe('SidenavHeaderComponent', () => {
  let component: SidenavHeaderComponent;
  let fixture: ComponentFixture<SidenavHeaderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SidenavHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidenavHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
