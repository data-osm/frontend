import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HttpErrorComponent } from './http-error.component';

describe('HttpErrorComponent', () => {
  let component: HttpErrorComponent;
  let fixture: ComponentFixture<HttpErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HttpErrorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HttpErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
