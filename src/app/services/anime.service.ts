import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { environment } from '../../environments/environment';
import 'rxjs/add/operator/map';

@Injectable()
export class AnimeService {

  user;
  authToken;
  options;
  domain = environment.domain;

  constructor(
    private http: Http
  ) { }

  malSearch(name) {
    return this.http.post(this.domain + '/api/malSearch', { query: name }).map(res => res.json());
  }
  addAnimeToCatalog(anime, category) {
    return this.http.post(this.domain + '/api/addAnimeToCatalog', { category: category, anime: anime }).map(res => res.json());
  }
  removeAnimeFromCatalog(animeID) {
    return this.http.post(this.domain + '/api/removeAnimeFromCatalog', { id: animeID }).map(res => res.json());
  }
  changeCategory(animeID, newCategory) {
    return this.http.post(this.domain + '/api/changeCategory', { id: animeID, category: newCategory }).map(res => res.json());
  }
  fetchAnime(user) {
    return this.http.post(this.domain + '/api/fetchAnime', { user: user }).map(res => res.json());
  }
  selectAsFinalist(animeID, comments) {
    return this.http.post(this.domain + '/api/changeFinalistStatus', { id: animeID, newStatus: true, comments: comments }).map(res => res.json());
  }
  removeFinalist(animeID) {
    return this.http.post(this.domain + '/api/changeFinalistStatus', { id: animeID, newStatus: false }).map(res => res.json());
  }
}
