import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  avatar: string;
  currentUser: string;

  loadDefaultImage() {
    // if avatar image doesn't load, we load our default
    this.avatar = "http://s3.amazonaws.com/37assets/svn/765-default-avatar.png";
  }

  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.avatar = "";
    this.currentUser = "";
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            this.avatar = res["user"]["avatar"];
          } else {
            console.log(res);
          }
        })
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res["message"]);
      }
    });
  }

}
