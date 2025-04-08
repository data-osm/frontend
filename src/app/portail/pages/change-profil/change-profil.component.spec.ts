import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChangeProfilComponent } from './change-profil.component';

describe('ChangeProfilComponent', () => {
  let component: ChangeProfilComponent;
  let fixture: ComponentFixture<ChangeProfilComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangeProfilComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeProfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
