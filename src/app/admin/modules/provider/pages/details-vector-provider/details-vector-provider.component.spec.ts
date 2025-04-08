import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DetailsVectorProviderComponent } from './details-vector-provider.component';

describe('DetailsVectorProviderComponent', () => {
  let component: DetailsVectorProviderComponent;
  let fixture: ComponentFixture<DetailsVectorProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsVectorProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsVectorProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
