import { TestBed } from '@angular/core/testing';

import { IsauthGuard } from './isauth.guard';

describe('IsauthGuard', () => {
  let guard: IsauthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(IsauthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
