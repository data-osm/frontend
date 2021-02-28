import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoucheThematiqueComponent } from './couche-thematique.component';

describe('CoucheThematiqueComponent', () => {
  let component: CoucheThematiqueComponent;
  let fixture: ComponentFixture<CoucheThematiqueComponent>;

  beforeEach(async(() => {
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
