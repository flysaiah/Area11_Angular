import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TopTens } from '../toptens/toptens';
import 'rxjs/add/operator/map';

@Injectable()
export class TopTensService {

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

  addNewCategory(groupName: string, newCategory: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/toptens/addNewCategory', { groupName: groupName, newCategory: newCategory }, this.options).map(res => res.json());
  }

  getTopTensInfo(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/toptens/getTopTensInfo', { groupName: groupName }, this.options).map(res => res.json());
  }

  saveChanges(groupName: string, toptensObj: TopTens) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/toptens/saveChanges', { groupName: groupName, toptensObj: toptensObj }, this.options).map(res => res.json());
  }

  deleteCategory(groupName: string, category: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/toptens/deleteCategory', { groupName: groupName, category: category }, this.options).map(res => res.json());
  }

  constructor(
    private http: Http,
    private authService: AuthService
  ) { }
}
