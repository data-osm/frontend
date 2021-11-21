import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateBaseMapComponent } from './update-base-map.component';

describe('UpdateBaseMapComponent', () => {
  let component: UpdateBaseMapComponent;
  let fixture: ComponentFixture<UpdateBaseMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdateBaseMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateBaseMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
