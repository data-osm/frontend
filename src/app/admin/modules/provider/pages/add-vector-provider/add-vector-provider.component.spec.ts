import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddVectorProviderComponent } from './add-vector-provider.component';

describe('AddVectorProviderComponent', () => {
  let component: AddVectorProviderComponent;
  let fixture: ComponentFixture<AddVectorProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AddVectorProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddVectorProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
