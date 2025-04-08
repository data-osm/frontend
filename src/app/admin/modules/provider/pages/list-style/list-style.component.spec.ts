import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListStyleComponent } from './list-style.component';

describe('ListStyleComponent', () => {
  let component: ListStyleComponent;
  let fixture: ComponentFixture<ListStyleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListStyleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
