import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { GroupService } from '../services/group.service';
import { Group } from './group';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit {

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;
  avatar: string;

  newGroupName: string;
  currentGroup: Group;

  currentUser: string;

  createGroup() {
    this.groupService.createGroup(this.newGroupName, this.currentUser).subscribe((res) => {
      if (!res["success"]) {
        this.displayToast("There was a problem creating the group", true);
      } else {
        this.displayToast("Group successfully created!");
        this.refresh();
      }
    })
  }

  disbandGroup() {
    this.groupService.disbandGroup(this.currentGroup["name"]).subscribe((res) => {
      if (!res["success"]) {
        this.displayToast("There was a problem deleting the account.", true);
      }
      this.refresh();
    });
  }

  private displayToast(message: string, error?: boolean) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true;
    this.toastMessage = message;
    if (error) {
      this.toastError = true;
    }
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
      this.toastError = false;
    }, 3000);
  }

  loadDefaultImage(target) {
    // if avatar image doesn't load, we load our default
    target.src = "http://s3.amazonaws.com/37assets/svn/765-default-avatar.png";
  }

  refresh() {
    this.newGroupName = "";
    this.currentGroup = new Group("",[],[]);
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            this.avatar = res["user"]["avatar"];
            if (res["user"]["group"]) {
              this.groupService.getGroupInfo(res["user"]["group"]).subscribe((res) => {
                if (res["success"]) {
                  this.currentGroup = res["group"];
                  console.log(this.currentGroup);
                } else {
                  if (res["message"] == "No group found") {
                    this.displayToast("Your group was disbanded", true);
                  } else {
                    this.displayToast("There was a problem loading your group information.", true);
                  }
                }
              })
            }
          } else {
            this.displayToast("There was a problem loading your profile.", true)
          }
        })
      } else {
        // If there was a problem we need to have them log in again
        console.log(res["message"]);
        this.authService.logout();
      }
    })
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private groupService: GroupService
  ) { }

  ngOnInit() {
    this.refresh();
  }

}
