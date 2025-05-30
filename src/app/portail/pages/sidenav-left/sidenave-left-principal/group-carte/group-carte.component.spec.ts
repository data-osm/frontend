import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GroupCarteComponent } from './group-carte.component';

describe('GroupCarteComponent', () => {
  let component: GroupCarteComponent;
  let fixture: ComponentFixture<GroupCarteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupCarteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupCarteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
