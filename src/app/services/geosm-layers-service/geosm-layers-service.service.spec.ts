import { TestBed } from '@angular/core/testing';

import { GeosmLayersServiceService } from './geosm-layers-service.service';

describe('GeosmLayersServiceService', () => {
  let service: GeosmLayersServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeosmLayersServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
