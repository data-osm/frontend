import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VerticalToolbarComponent } from './vertical-toolbar.component';

describe('VerticalToolbarComponent', () => {
  let component: VerticalToolbarComponent;
  let fixture: ComponentFixture<VerticalToolbarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VerticalToolbarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerticalToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
