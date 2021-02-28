import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStyleComponent } from './edit-style.component';

describe('EditStyleComponent', () => {
  let component: EditStyleComponent;
  let fixture: ComponentFixture<EditStyleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditStyleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
