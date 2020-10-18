import { TestBed } from '@angular/core/testing';

import { VectorProviderService } from './vector-provider.service';

describe('VectorProviderService', () => {
  let service: VectorProviderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VectorProviderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
