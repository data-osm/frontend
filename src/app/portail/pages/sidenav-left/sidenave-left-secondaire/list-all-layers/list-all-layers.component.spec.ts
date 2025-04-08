import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListAllLayersComponent } from './list-all-layers.component';

describe('ListAllLayersComponent', () => {
  let component: ListAllLayersComponent;
  let fixture: ComponentFixture<ListAllLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListAllLayersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListAllLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
