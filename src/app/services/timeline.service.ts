import { Injectable } from '@angular/core'
import { Headers, Http, RequestOptions } from '@angular/http'
import { environment } from '../../environments/environment'
import { Era } from '../timeline/era'
import { AuthService } from './auth.service'

@Injectable()
export class TimelineService {
  options
  domain = environment.domain

  createAuthenticationHeaders() {
    this.authService.loadToken()
    this.options = new RequestOptions({
      headers: new Headers({
        'Content-Type': 'application/json',
        authorization: this.authService.authToken,
      }),
    })
  }

  constructor(private http: Http, private authService: AuthService) {}

  createTimeline() {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/timeline/createTimeline', {}, this.options).map(res => res.json())
  }

  saveTimeline(eras: Era[]) {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/timeline/saveTimeline', { eras: eras }, this.options).map(res => res.json())
  }

  fetchTimeline(user: string) {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/timeline/fetchTimeline', { user: user }, this.options).map(res => res.json())
  }

  addAnimeToTimeline(name: string, index: number) {
    this.createAuthenticationHeaders()
    return this.http
      .post(this.domain + '/api/timeline/addAnimeToTimeline', { name: name, index: index }, this.options)
      .map(res => res.json())
  }
}
