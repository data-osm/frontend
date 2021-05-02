import { TestBed } from '@angular/core/testing';

import { DataOsmLayersServiceService } from './data-som-layers-service.service';

describe('DataOsmLayersServiceService', () => {
  let service: DataOsmLayersServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataOsmLayersServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
