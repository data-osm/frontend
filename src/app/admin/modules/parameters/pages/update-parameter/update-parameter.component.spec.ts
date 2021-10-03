import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateParameterComponent } from './update-parameter.component';

describe('UpdateParameterComponent', () => {
  let component: UpdateParameterComponent;
  let fixture: ComponentFixture<UpdateParameterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateParameterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
