import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UpdateTagsComponent } from './update-tags.component';

describe('UpdateTagsComponent', () => {
  let component: UpdateTagsComponent;
  let fixture: ComponentFixture<UpdateTagsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateTagsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
