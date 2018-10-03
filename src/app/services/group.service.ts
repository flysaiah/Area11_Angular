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
    return this.http.post(this.domain + '/api/group/createGroup', { groupName: groupName }, this.options).map(res => res.json());
  }

  getGroupInfo(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/getGroupInfo', { groupName: groupName }, this.options).map(res => res.json());
  }
  leaveGroup(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/leaveGroup', {groupName: groupName}, this.options).map(res => res.json());
  }
  disbandGroup(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/disbandGroup', { groupName: groupName }, this.options).map(res => res.json());
  }
  joinGroupRequest(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/joinGroupRequest', { groupName: groupName }, this.options).map(res => res.json());
  }
  acceptUserRequest(groupName: string, pendingUser: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/acceptUserRequest', { groupName: groupName, pendingUser: pendingUser }, this.options).map(res => res.json());
  }
  rejectUserRequest(groupName: string, pendingUser: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/rejectUserRequest', { groupName: groupName, pendingUser: pendingUser }, this.options).map(res => res.json());
  }
  saveChanges(groupName: string, groupChangesModel: Group) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/saveGroupChanges', { groupName: groupName, groupChangesModel: groupChangesModel }, this.options).map(res => res.json());
  }
  fetchImportableAnime(fromUserID: string, fromUser: string, toUser: string, groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/fetchImportableAnime', { fromUserID: fromUserID, fromUser: fromUser, toUser: toUser, groupName: groupName }, this.options).map(res => res.json());
  }
  importAnime(groupName: string, animeList: string[]) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/importAnime', { groupName: groupName, animeList: animeList }, this.options).map(res => res.json());
  }
  importCatalog(fromUserID: string, fromUser: string, toUser: string, groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/importCatalog', { fromUserID: fromUserID, fromUser: fromUser, toUser: toUser, groupName: groupName }, this.options).map(res => res.json());
  }
  getGroupMemberAnime(groupName: string) {
    this.createAuthenticationHeaders();
    return this.http.post(this.domain + '/api/group/getGroupMemberAnime', { groupName: groupName }, this.options).map(res => res.json());
  }

  constructor(
    private authService: AuthService,
    private http: Http
  ) { }

}
