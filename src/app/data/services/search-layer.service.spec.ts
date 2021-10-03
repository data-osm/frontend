import { TestBed } from '@angular/core/testing';

import { SearchLayerService } from './search-layer.service';

describe('SearchLayerService', () => {
  let service: SearchLayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchLayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
