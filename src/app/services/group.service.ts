import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { AuthService } from './auth.service';
import { Group } from '../group/group';
@Injectable()
export class GroupService {

  options;
  domain = this.authService.domain;

  createAuthenticationHeaders() {
    this.authService.loadToken();
    this.options = new RequestOptions({
      headers: new Headers({
        'Content-Type': 'application/json',
        'authorization': this.authService.authToken
      })
    });
  }

  createGroup(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/createGroup', { name: groupName }, this.options).map(res => res.json());
  }

  getGroupInfo(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/getGroupInfo', { name: groupName }, this.options).map(res => res.json());
  }
  leaveGroup(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/leaveGroup', {groupName: groupName}, this.options).map(res => res.json());
  }
  disbandGroup(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/disbandGroup', { name: groupName }, this.options).map(res => res.json());
  }
  joinGroupRequest(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/joinGroupRequest', { groupName: groupName }, this.options).map(res => res.json());
  }
  acceptUserRequest(groupName: string, pendingUser: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/acceptUserRequest', { name: groupName, pendingUser: pendingUser }, this.options).map(res => res.json());
  }
  rejectUserRequest(groupName: string, pendingUser: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/rejectUserRequest', { name: groupName, pendingUser: pendingUser }, this.options).map(res => res.json());
  }
  saveChanges(groupName: string, groupChangesModel: Group) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/saveGroupChanges', { groupName: groupName, groupChangesModel: groupChangesModel }, this.options).map(res => res.json());
  }
  importCatalog(fromUserID: string, fromUser: string, toUser: string, groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/importCatalog', { fromUserID: fromUserID, fromUser: fromUser, toUser: toUser, groupName: groupName }, this.options).map(res => res.json());
  }

  constructor(
    private authService: AuthService,
    private http: Http
  ) { }

}
