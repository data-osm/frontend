import { TestBed } from '@angular/core/testing';

import { OsmService } from './osm.service';

describe('OsmService', () => {
  let service: OsmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OsmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
