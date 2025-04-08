import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CoucheThematiqueComponent } from './couche-thematique.component';

describe('CoucheThematiqueComponent', () => {
  let component: CoucheThematiqueComponent;
  let fixture: ComponentFixture<CoucheThematiqueComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CoucheThematiqueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoucheThematiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
