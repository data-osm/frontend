import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SigFileProviderComponent } from './sig-file-provider.component';

describe('SigFileProviderComponent', () => {
  let component: SigFileProviderComponent;
  let fixture: ComponentFixture<SigFileProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SigFileProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SigFileProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
