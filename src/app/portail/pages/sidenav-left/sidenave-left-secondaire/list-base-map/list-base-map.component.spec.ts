import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBaseMapComponent } from './list-base-map.component';

describe('ListBaseMapComponent', () => {
  let component: ListBaseMapComponent;
  let fixture: ComponentFixture<ListBaseMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListBaseMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListBaseMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
