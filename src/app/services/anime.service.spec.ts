import { TestBed, inject } from '@angular/core/testing'

import { AnimeService } from './anime.service'

describe('AnimeServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnimeService],
    })
  })

  it('should be created', inject([AnimeService], (service: AnimeService) => {
    expect(service).toBeTruthy()
  }))
})
