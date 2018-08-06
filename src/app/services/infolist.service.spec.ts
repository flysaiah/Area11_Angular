import { TestBed, inject } from '@angular/core/testing';

import { InfolistService } from './infolist.service';

describe('InfolistService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InfolistService]
    });
  });

  it('should be created', inject([InfolistService], (service: InfolistService) => {
    expect(service).toBeTruthy();
  }));
});
