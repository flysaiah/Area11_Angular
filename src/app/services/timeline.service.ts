import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Era } from '../timeline/era';
import 'rxjs/add/operator/map';

@Injectable()
export class TimelineService {

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

  createTimeline() {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/timeline/createTimeline', { }, this.options).map(res => res.json());
  }

  saveTimeline(eras: Era[]) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/timeline/saveTimeline', { eras: eras }, this.options).map(res => res.json());
  }

  fetchTimeline() {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/timeline/fetchTimeline', { }, this.options).map(res => res.json());
  }

  addAnimeToTimeline(name: string, index: number) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/timeline/addAnimeToTimeline', { name: name, index: index }, this.options).map(res => res.json());
  }
}
