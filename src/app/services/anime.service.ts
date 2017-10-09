import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import 'rxjs/add/operator/map';

@Injectable()
export class AnimeService {

  user;
  authToken;
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
    return this.http.post(this.domain + '/api/malSearch', { query: name }, this.options).map(res => res.json());
  }
  addAnimeToCatalog(anime) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/addAnimeToCatalog', { anime: anime }, this.options).map(res => res.json());
  }
  removeAnimeFromCatalog(animeID) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/removeAnimeFromCatalog', { id: animeID }, this.options).map(res => res.json());
  }
  changeCategory(animeID, newCategory) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/changeCategory', { id: animeID, category: newCategory }, this.options).map(res => res.json());
  }
  fetchAnime(user) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/fetchAnime', { user: user }, this.options).map(res => res.json());
  }
  selectAsFinalist(animeID, comments) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/changeFinalistStatus', { id: animeID, newStatus: true, comments: comments }, this.options).map(res => res.json());
  }
  removeFinalist(animeID) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/changeFinalistStatus', { id: animeID, newStatus: false }).map(res => res.json());
  }
}
