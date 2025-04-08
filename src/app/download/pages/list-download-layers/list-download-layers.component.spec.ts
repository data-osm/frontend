import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListDownloadLayersComponent } from './list-download-layers.component';

describe('ListDownloadLayersComponent', () => {
  let component: ListDownloadLayersComponent;
  let fixture: ComponentFixture<ListDownloadLayersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListDownloadLayersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListDownloadLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
