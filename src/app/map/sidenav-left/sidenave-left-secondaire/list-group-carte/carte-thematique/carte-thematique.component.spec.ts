import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarteThematiqueComponent } from './carte-thematique.component';

describe('CarteThematiqueComponent', () => {
  let component: CarteThematiqueComponent;
  let fixture: ComponentFixture<CarteThematiqueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CarteThematiqueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarteThematiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
