import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBaseMapComponent } from './add-base-map.component';

describe('AddBaseMapComponent', () => {
  let component: AddBaseMapComponent;
  let fixture: ComponentFixture<AddBaseMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddBaseMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddBaseMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
