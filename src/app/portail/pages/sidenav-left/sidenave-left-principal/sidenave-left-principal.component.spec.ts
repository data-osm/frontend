import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SidenaveLeftPrincipalComponent } from './sidenave-left-principal.component';

describe('SidenaveLeftPrincipalComponent', () => {
  let component: SidenaveLeftPrincipalComponent;
  let fixture: ComponentFixture<SidenaveLeftPrincipalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SidenaveLeftPrincipalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidenaveLeftPrincipalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
