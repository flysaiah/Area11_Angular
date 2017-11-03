import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  userAvatar: string;
  currentUser: string;

  logout() {
    this.authService.logout();
  }

  @Input()
  set refreshHeader(refreshHeader: number) {
    this.refresh();
  }

  private refresh() {
    this.userAvatar = "";
    this.currentUser = "";
    // Load avatar & username
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userAvatar = "/" + res["user"]["_id"];
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res["message"]);
      }
    });
  }

  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.refresh();
  }

}
