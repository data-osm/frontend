import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UpdateParameterComponent } from './update-parameter.component';

describe('UpdateParameterComponent', () => {
  let component: UpdateParameterComponent;
  let fixture: ComponentFixture<UpdateParameterComponent>;

  beforeEach(waitForAsync(() => {
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
