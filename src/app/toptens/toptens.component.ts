import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { GroupService } from '../services/group.service';
import { TopTensService } from '../services/toptens.service';
import { Group } from '../group/group';
import { TopTens } from './toptens';
import { ConfirmDialog } from '../app.component';
import { MatDialog } from '@angular/material';

@Component({
  selector: 'app-toptens',
  templateUrl: './toptens.component.html',
  styleUrls: ['./toptens.component.css']
})
export class TopTensComponent implements OnInit {

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  refreshHeader: number;

  currentUser: string;

  // Used for keeping track of editing as well as whose lists are being viewed
  categoryLogistics: {member: string, isEditing: boolean}[];

  currentGroup: Group;
  currentGroupMembers: {id: string, username: string, avatar: string, bestgirl: string, isPending: boolean}[];

  allTopTens: TopTens[];
  allCategories: TopTens[];
  topTensMap: Map<string, Map<string, TopTens>>;
  newCategoryName: string;
  currentCategory: string;

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

  private getGroupMembers() {
    for (let member of this.currentGroup["members"]) {
      if (!member["isPending"]) {
        this.currentGroupMembers.push(member);
      }
    }
  }

  addNewCategory() {
    this.toptensService.addNewCategory(this.currentGroup.name, this.newCategoryName).subscribe((res) => {
      if (res["success"]) {
        this.newCategoryName = "";
        this.displayToast("New category added!");
        this.refresh();
      } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
        this.displayToast("There is a problem with your group membership.", true)
      } else if (res["message"] == "Category already exists") {
        this.displayToast("This category already exists.", true)
      } else {
        console.log(res);
        this.displayToast("There was a problem.", true)
      }
    });
  }

  enterEditMode(index: number) {
    this.categoryLogistics[index].isEditing = true;
  }

  saveChanges(category: string, index: number) {
    this.toptensService.saveChanges(this.currentGroup.name, this.topTensMap.get(category).get(this.currentUser)).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Your changes have been saved!");
        this.categoryLogistics[index].isEditing = false;
        this.refresh();
      } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
        this.displayToast("There is a problem with your group membership.", true)
      } else {
        console.log(res);
        this.displayToast("There was a problem.", true)
      }
    });
  }

  private generateLogistics() {
    this.categoryLogistics = [];
    for (let category of this.allCategories) {
      this.categoryLogistics.push({member: this.currentUser, isEditing: false});
    }
  }

  private organizeTopTens() {
    // Separate top tens into lists for each category & member
    this.topTensMap = new Map();
    for (let toptensObj of this.allTopTens) {
      // Ignore category labels
      if (toptensObj.hasNoContent) {
        continue;
      }
      if (!this.topTensMap.get(toptensObj.category)) {
        let newMap = new Map<string, TopTens>();
        newMap.set(toptensObj.user, toptensObj);
        this.topTensMap.set(toptensObj.category, newMap);
      } else if (!this.topTensMap.get(toptensObj.category).get(toptensObj.user)) {
        this.topTensMap.get(toptensObj.category).set(toptensObj.user, toptensObj);
      } else {
        console.log("This shouldn't be happening");
      }
    }
    // Fill in whatever gaps exist
    for (let category of this.allCategories) {
      if (!this.topTensMap.get(category.category)) {
        this.topTensMap.set(category.category, new Map<string, TopTens>());
      }
      for (let member of this.currentGroupMembers) {
        if (!this.topTensMap.get(category.category).get(member.username)) {
          let viewerPrefs = [];
          for (let gMemb of this.currentGroupMembers) {
            if (gMemb.username != this.currentUser) {
              viewerPrefs.push({ member: gMemb.username, shouldHide: false });
            }
          }
          let newEntries = [];
          for (let i=0; i<10; i++) {
            newEntries.push({ name: "", viewerPrefs: JSON.parse(JSON.stringify(viewerPrefs))})
          }
          let newTT = {
            group: this.currentGroup.name,
            category: category.category,
            entries: newEntries,
            user: member.username
          };
          this.topTensMap.get(category.category).set(member.username, newTT);
        }
      }
    }
  }

  deleteCategory(category: string) {
    let dialogRef = this.dialog.open(ConfirmDialog, {
      data: { doIt: true }
    });

    dialogRef.afterClosed().subscribe((result) => {
      // Result is the index of the anime they chose to link, if they chose to link one
      if (result) {
        this.toptensService.deleteCategory(this.currentGroup["name"], category).subscribe((res) => {
          if (res["success"]) {
            this.displayToast("Category deleted successfully!");
            if (this.currentCategory == category) {
              this.currentCategory = "All Categories";
            }
            this.refresh();
          } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
            this.displayToast("There is a problem with your group membership.", true)
          } else {
            console.log(res);
            this.displayToast("There was a problem.", true)
          }
        });
      }
    });
  }

  isHidden(entry) {
    if (!entry["name"]) {
      return false;
    }
    for (let memb of entry["viewerPrefs"]) {
      if (memb["member"] == this.currentUser && memb["shouldHide"] == true) {
        return true;
      }
    }
    return false;
  }

  private refresh() {
    this.refreshHeader = Math.random();

    this.toptensService.getTopTensInfo(this.currentGroup.name).subscribe((res) => {
      if (res["success"]) {
        this.allCategories = res["allCategories"];
        this.allTopTens = res["allTopTens"];
        this.generateLogistics();
        this.organizeTopTens();
      } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
        this.displayToast("There is a problem with your group membership.", true)
      } else {
        console.log(res);
        this.displayToast("There was a problem.", true)
      }
    });
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private groupService: GroupService,
    private toptensService: TopTensService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.currentGroupMembers = [];
    this.currentGroup = new Group("",[]);
    this.newCategoryName = "";
    this.allTopTens = [];
    this.topTensMap = new Map();
    this.allCategories = [];
    this.categoryLogistics = [];
    this.currentCategory = "All Categories";

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            if (res["user"]["group"]) {
              this.groupService.getGroupInfo(res["user"]["group"]).subscribe((res) => {
                if (res["success"]) {
                  this.currentGroup = res["group"];
                  this.getGroupMembers();
                  this.refresh();
                } else {
                  if (res["message"] == "No group found") {
                    this.displayToast("Your group was disbanded", true);
                  } else if (res["message"] == "Invalid group membership") {
                    this.displayToast("You are no longer a member of this group.", true)
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
        });
      } else {
        // If there was a problem we need to have them log in again
        console.log(res["message"]);
        this.authService.logout();
      }
    });
  }
}
