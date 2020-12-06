import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMapComponent } from './edit-map.component';

describe('EditMapComponent', () => {
  let component: EditMapComponent;
  let fixture: ComponentFixture<EditMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
