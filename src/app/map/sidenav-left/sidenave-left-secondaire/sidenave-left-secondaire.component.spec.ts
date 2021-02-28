import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenaveLeftSecondaireComponent } from './sidenave-left-secondaire.component';

describe('SidenaveLeftSecondaireComponent', () => {
  let component: SidenaveLeftSecondaireComponent;
  let fixture: ComponentFixture<SidenaveLeftSecondaireComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SidenaveLeftSecondaireComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidenaveLeftSecondaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
