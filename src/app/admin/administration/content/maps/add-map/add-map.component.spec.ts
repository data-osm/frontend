import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMapComponent } from './add-map.component';

describe('AddMapComponent', () => {
  let component: AddMapComponent;
  let fixture: ComponentFixture<AddMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
