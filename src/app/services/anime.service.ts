import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import 'rxjs/add/operator/map';

@Injectable()
export class AnimeService {

  options;
  domain = environment.domain;

  createAuthenticationHeaders() {
    this.authService.loadToken();
    this.options = new RequestOptions({
      headers: new Headers({
        'Content-Type': 'application/json',
        'authorization': this.authService.authToken
      })
    });
  }

  constructor(
    private http: Http,
    private authService: AuthService
  ) { }

  malSearch(name) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/malSearch', { query: name }, this.options).map(res => res.json());
  }
  addAnimeToCatalog(anime) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/addAnimeToCatalog', { anime: anime }, this.options).map(res => res.json());
  }
  removeAnimeFromCatalog(animeID: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/removeAnimeFromCatalog', { id: animeID }, this.options).map(res => res.json());
  }
  changeCategory(animeID: string, newCategory: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/changeCategory', { id: animeID, category: newCategory }, this.options).map(res => res.json());
  }
  fetchAnime(user) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/fetchAnime', { user: user }, this.options).map(res => res.json());
  }
  selectAsFinalist(animeID: string, comments: string[]) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/changeFinalistStatus', { id: animeID, newStatus: true, comments: comments }, this.options).map(res => res.json());
  }
  removeFinalist(animeID) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/changeFinalistStatus', { id: animeID, newStatus: false }, this.options).map(res => res.json());
  }
  recommendAnime(anime, recommender: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/recommendAnime', { anime: anime, recommender: recommender }, this.options).map(res => res.json());
  }
  undoRecommendAnime(anime, recommender: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/anime/undoRecommendAnime', { anime: anime, recommender: recommender }, this.options).map(res => res.json());
  }
}
