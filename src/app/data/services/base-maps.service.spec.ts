import { TestBed } from '@angular/core/testing';

import { BaseMapsService } from './base-maps.service';

describe('BaseMapsService', () => {
  let service: BaseMapsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseMapsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
