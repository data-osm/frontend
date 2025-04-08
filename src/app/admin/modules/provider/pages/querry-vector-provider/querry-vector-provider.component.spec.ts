import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { QuerryVectorProviderComponent } from './querry-vector-provider.component';

describe('QuerryVectorProviderComponent', () => {
  let component: QuerryVectorProviderComponent;
  let fixture: ComponentFixture<QuerryVectorProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ QuerryVectorProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuerryVectorProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
