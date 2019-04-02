import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { GroupService } from '../services/group.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  userAvatar: string;
  currentUser: string;
  countdownDate: string;
  countdownName: string;
  interval;

  logout() {
    this.authService.logout();
  }

  private getCountdownString(endDate: Date) {

    var now = new Date().getTime();

    // Find the distance between now and the count down date
    var distance = new Date(endDate).getTime() - now;

    // Time calculations for days, hours, minutes and seconds
    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  }

  @Input()
  set refreshHeader(refreshHeader: number) {
    this.refresh();
  }

  private refresh() {
    this.userAvatar = "";
    this.currentUser = "";
    clearInterval(this.interval);
    // Load avatar & username
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userAvatar = "/" + res["user"]["_id"];

        // If user is in group and this is the group page, check for countdown timer
        let tmp = window.location.href.split("/");
        if (tmp[tmp.length - 1] === "group") {   // FIXME: This is kinda ugly
          this.userService.getUserInfo().subscribe((res) => {
            if (res["success"] && res["user"]["group"]) {
              this.groupService.getGroupInfo(res["user"]["group"]).subscribe((res) => {
                if (res["success"] && res["group"]["countdown"] && res["group"]["countdown"]["name"] && res["group"]["countdown"]["date"]) {
                  this.countdownDate = this.getCountdownString(res["group"]["countdown"]["date"]);
                  this.countdownName = res["group"]["countdown"]["name"];
                  this.interval = setInterval(() => {
                    this.countdownDate = this.getCountdownString(res["group"]["countdown"]["date"]);
                  }, 1000);
                }
              });
            }
          });
        } else {
          this.countdownDate = "";
          this.countdownName = "";
        }

      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res["message"]);
      }
    });
  }

  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.refresh();
  }

}
