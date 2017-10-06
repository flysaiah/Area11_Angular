import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { tokenNotExpired } from 'angular2-jwt';
import { environment } from '../../environments/environment';
import 'rxjs/add/operator/map';

@Injectable()
export class AuthService {

  user;
  authToken;
  options;
  domain = environment.domain;

  constructor(
    private http: Http
  ) { }

  isLoggedIn() {
    return tokenNotExpired();
  }

  registerUser(user) {
    return this.http.post(this.domain + '/authentication/register', user).map(res => res.json());
  }
  login(user) {
    return this.http.post(this.domain + '/authentication/login', user).map(res => res.json());
  }
  logout() {
    this.authToken = null;
    this.user = null;
    localStorage.clear();
  }
  storeUserData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.authToken = token;
    this.user = user;
  }
  loadToken() {
    return localStorage.getItem('token');
  }
  createAuthenticationHeaders() {
    const authToken = this.loadToken();
    this.options = new RequestOptions({
      headers: new Headers({
        'Content-type': 'application/json',
        'authorization': this.authToken
      })
    })
  }
  getProfile() {
    this.createAuthenticationHeaders();
    return this.http.get(this.domain + '/authentication/profile', this.options).map(res => res.json());
  }

  // this.authService.getProfile().subscribe(profile => {
  //   this.user = profile.user;
  // })

}