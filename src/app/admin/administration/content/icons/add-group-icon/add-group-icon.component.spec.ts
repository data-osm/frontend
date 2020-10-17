import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGroupIconComponent } from './add-group-icon.component';

describe('AddGroupIconComponent', () => {
  let component: AddGroupIconComponent;
  let fixture: ComponentFixture<AddGroupIconComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddGroupIconComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddGroupIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
