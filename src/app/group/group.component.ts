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

  newGroupName: string;
  newGroupAvatar: string;
  joinGroupName: string;
  currentGroup: Group;
  // Use these arrays so we can iterate through isPending=true vs isPending=false easier in the HTML
  currentGroupMembers: {id: string, username: string, avatar: string, bestgirl: string, isPending: boolean}[];
  pendingGroupRequests: {id: string, username: string, avatar: string, bestgirl: string, isPending: boolean}[];
  pendingUserRequests: {id: string, username: string, avatar: string, bestgirl: string, isPending: boolean}[];

  currentUser: string;

  createGroup() {
    this.groupService.createGroup(this.newGroupName, this.newGroupAvatar).subscribe((res) => {
      if (!res["success"]) {
        this.displayToast("There was a problem creating the group", true);
      } else {
        this.displayToast("Group successfully created!");
        this.refresh();
      }
    });
  }

  acceptUserRequest(pendingUser: {id: string, username: string}) {
    // Change isPending status of user
    this.groupService.acceptUserRequest(this.currentGroup["name"], pendingUser.id).subscribe((res) => {
      if (res["success"]) {
        this.displayToast(pendingUser.username + " successfully added to group!");
        this.refresh();
      } else if (res["message"] == "Already in group") {
        this.displayToast(pendingUser.username + "is has already been accepted", true);
        this.refresh();
      } else {
        this.displayToast("There was a problem accepting the request");
        console.log(res);
      }
    });
  }

  joinGroupRequest() {
    // Send a request to join group; adds user as a member with isPending=true
    this.groupService.joinGroupRequest(this.joinGroupName).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Your request has been sent!");
      } else if (res["message"] == "Already requested") {
        this.displayToast("You have already requested membership to this group.", true);
      } else if (res["message"] == "No group found") {
        this.displayToast("That group doesn't exist", true);
      } else {
        this.displayToast("There was a problem with sending your request.", true);
      }
    });
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

  logout() {
    this.authService.logout();
  }

  importCatalog(user: string) {
    // Adds all MAL-linked anime from one user's catalog to this user's catalog (in 'Considering' category) that don't already exist in the latter
    this.groupService.importCatalog(user, this.currentUser).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("You have successfully imported " + user + "'s catalog!'")
      } else if (res["message"] == "Nothing to import") {
        this.displayToast("This user has nothing in their catalog.", true);
      } else {
        this.displayToast("Something went wrong while importing " + user + "'s catalog.", true);
        console.log(res);
      }
    });
  }

  generateUserRequests() {
    // Filters members by whether they're actually members or are pending (have requested membership)
    for (let member of this.currentGroup["members"]) {
      if (member["isPending"]) {
        this.pendingUserRequests.push(member);
      } else {
        this.currentGroupMembers.push(member);
      }
    }
  }

  refresh() {
    this.newGroupName = "";
    this.newGroupAvatar = "";
    this.joinGroupName = "";
    this.currentGroup = new Group("", []);
    this.currentGroupMembers = [];
    this.pendingGroupRequests = [];
    this.pendingUserRequests = [];
    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            if (res["user"]["group"]) {
              this.groupService.getGroupInfo(res["user"]["group"]).subscribe((res) => {
                if (res["success"]) {
                  this.currentGroup = res["group"];
                  this.generateUserRequests();
                } else {
                  if (res["message"] == "No group found") {
                    this.displayToast("Your group was disbanded", true);
                  } else {
                    console.log(res);
                    this.displayToast("There was a problem loading your group information.", true);
                  }
                }
              });
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
