import { TestBed, inject } from '@angular/core/testing';

import { AnimeServiceService } from './anime-service.service';

describe('AnimeServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnimeServiceService]
    });
  });

  it('should be created', inject([AnimeServiceService], (service: AnimeServiceService) => {
    expect(service).toBeTruthy();
  }));
});
