import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailMapComponent } from './detail-map.component';

describe('DetailMapComponent', () => {
  let component: DetailMapComponent;
  let fixture: ComponentFixture<DetailMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
