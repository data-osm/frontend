import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PsrComponent } from './psr.component';

describe('PsrComponent', () => {
  let component: PsrComponent;
  let fixture: ComponentFixture<PsrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PsrComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PsrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
