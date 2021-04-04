import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStyleComponent } from './add-style.component';

describe('AddStyleComponent', () => {
  let component: AddStyleComponent;
  let fixture: ComponentFixture<AddStyleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddStyleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
