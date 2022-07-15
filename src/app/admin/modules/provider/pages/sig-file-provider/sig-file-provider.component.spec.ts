import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SigFileProviderComponent } from './sig-file-provider.component';

describe('SigFileProviderComponent', () => {
  let component: SigFileProviderComponent;
  let fixture: ComponentFixture<SigFileProviderComponent>;

  beforeEach(async(() => {
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
