import { Injectable } from '@angular/core'
import { Headers, Http, RequestOptions } from '@angular/http'
import { environment } from '../../environments/environment'
import { Infolist } from '../infolists/infolist'
import { AuthService } from './auth.service'

@Injectable()
export class InfolistService {
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

  addNewInfolist(infolist: Infolist) {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/infolist/addNewInfolist', { infolist: infolist }, this.options).map(res => res.json())
  }

  saveInfolist(infolist: Infolist) {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/infolist/saveInfolist', { infolist: infolist }, this.options).map(res => res.json())
  }

  deleteInfolist(infolist: Infolist) {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/infolist/deleteInfolist', { infolist: infolist }, this.options).map(res => res.json())
  }

  fetchInfolists() {
    this.createAuthenticationHeaders()
    return this.http.post(this.domain + '/api/infolist/fetchInfolists', {}, this.options).map(res => res.json())
  }
}
