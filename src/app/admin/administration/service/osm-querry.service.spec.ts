import { TestBed } from '@angular/core/testing';

import { OsmQuerryService } from './osm-querry.service';

describe('OsmQuerryService', () => {
  let service: OsmQuerryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OsmQuerryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
