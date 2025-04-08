import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListGeosignetComponent } from './list-geosignet.component';

describe('ListGeosignetComponent', () => {
  let component: ListGeosignetComponent;
  let fixture: ComponentFixture<ListGeosignetComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListGeosignetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListGeosignetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
