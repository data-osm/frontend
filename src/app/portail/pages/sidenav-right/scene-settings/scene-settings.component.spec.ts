import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SceneSettingsComponent } from './scene-settings.component';

describe('SceneSettingsComponent', () => {
  let component: SceneSettingsComponent;
  let fixture: ComponentFixture<SceneSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SceneSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SceneSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
