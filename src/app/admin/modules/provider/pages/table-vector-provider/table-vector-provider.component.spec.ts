import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TableVectorProviderComponent } from './table-vector-provider.component';

describe('TableVectorProviderComponent', () => {
  let component: TableVectorProviderComponent;
  let fixture: ComponentFixture<TableVectorProviderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TableVectorProviderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableVectorProviderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
