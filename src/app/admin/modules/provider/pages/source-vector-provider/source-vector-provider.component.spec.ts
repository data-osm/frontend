import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SourceVectorProviderComponent } from './source-vector-provider.component';

describe('SourceVectorProviderComponent', () => {
  let component: SourceVectorProviderComponent;
  let fixture: ComponentFixture<SourceVectorProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SourceVectorProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceVectorProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
