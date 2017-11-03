import { TestBed, inject } from '@angular/core/testing';

import { TopTensService } from './toptens.service';

describe('ToptensService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TopTensService]
    });
  });

  it('should be created', inject([TopTensService], (service: TopTensService) => {
    expect(service).toBeTruthy();
  }));
});
