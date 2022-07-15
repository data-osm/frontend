import { TestBed } from '@angular/core/testing';

import { SigFileService } from './sig-file.service';

describe('SigFileService', () => {
  let service: SigFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SigFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
