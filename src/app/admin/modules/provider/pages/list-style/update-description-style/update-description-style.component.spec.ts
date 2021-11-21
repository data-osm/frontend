import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateDescriptionStyleComponent } from './update-description-style.component';

describe('UpdateDescriptionStyleComponent', () => {
  let component: UpdateDescriptionStyleComponent;
  let fixture: ComponentFixture<UpdateDescriptionStyleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateDescriptionStyleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateDescriptionStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
