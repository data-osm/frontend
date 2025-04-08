import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UpdateProviderComponent } from './update-provider.component';

describe('UpdateProviderComponent', () => {
  let component: UpdateProviderComponent;
  let fixture: ComponentFixture<UpdateProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
