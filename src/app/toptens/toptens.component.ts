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
  styleUrls: ['./toptens.component.scss']
})
export class TopTensComponent implements OnInit {

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  refreshHeader: number;

  currentUser: string;

  // Used for keeping track of editing as well as whose lists are being viewed AND whether it's in total order mode or not
  categoryLogistics: {member: string, isEditing: boolean}[];
  statusMap: Map<string, boolean>;   // Need array for HTML template and map for refresh logic
  oldVersionMap: Map<string, TopTens>;   // Cache old versions so when we edit we can cancel and undo our edits
  totalOrderMode: boolean;   // True when we are viewing total order for any 1 category (only 1 can be viewed at a time like this)

  filterText: string;
  dateFilter: string;
  dateFilterOptions: string[]

  currentGroup: Group;
  currentGroupMembers: {id: string, username: string, avatar: string, bestgirl: string, isPending: boolean}[];

  allTopTens: TopTens[];
  allCategories: TopTens[];
  allCategoriesFull: TopTens[];
  topTensMap: Map<string, Map<string, TopTens>>;
  newCategoryName: string;
  hideSelectorPanel: boolean;

  isLoading: boolean;

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
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        console.log(res);
        this.displayToast("There was a problem.", true)
      }
    });
  }

  selectAll() {
    this.allCategories.map((ttObj) => {
      ttObj.isSelected = true;
      return ttObj;
    })
  }

  selectNone() {
    this.allCategories.map((ttObj) => {
      ttObj.isSelected = false;
      return ttObj;
    })
  }

  enterEditMode(index: number, category: string) {
    this.categoryLogistics[index].isEditing = true;
    this.statusMap.set(category + "-edit", true);
    this.oldVersionMap.set(category, JSON.parse(JSON.stringify(this.topTensMap.get(category).get(this.currentUser))));
  }

  viewTotalOrdering() {
    this.totalOrderMode = true;
  }

  leaveTotalOrdering() {
    this.totalOrderMode = false;
  }

  cancelChanges(category: string, index: number) {
    // Load old version
    let oldVersion = JSON.parse(JSON.stringify(this.oldVersionMap.get(category)));
    this.topTensMap.get(category).set(this.currentUser, oldVersion);
    this.oldVersionMap.set(category, null);
    this.categoryLogistics[index].isEditing = false;
    this.statusMap.set(category + "-edit", false);
  }

  clearCategory(category: string) {
    // Reset this top tens object with 10 empty entries
    let currentTTO = this.topTensMap.get(category).get(this.currentUser);
    currentTTO.entries = currentTTO.entries.slice(0, 10);
    for (let entry of currentTTO.entries) {
      entry.name = "";
      for (let viewerPref of entry.viewerPrefs) {
        viewerPref.shouldHide = false;
      }
    }
  }

  saveChanges(category: string, index: number) {
    // This isn't very nice but for now it's the simplest way to avoid putting isSelected into database
    delete this.topTensMap.get(category).get(this.currentUser).isSelected;
    // If no real content changes then don't update the "Last Edited Date" field
    let noRealChanges = true;
    let topTensObj = this.topTensMap.get(category).get(this.currentUser);
    let oldVersion = this.oldVersionMap.get(category);
    if (topTensObj.entries.length !== oldVersion.entries.length) {
      noRealChanges = false;
    } else {
      for (let i=0; i<topTensObj.entries.length; i++) {
        if (topTensObj.entries[i].name !== oldVersion.entries[i].name) {
          noRealChanges = false;
          break;
        }
      }
    }
    if (!noRealChanges) {
      topTensObj.lastEditedDate = new Date();
    }
    this.toptensService.saveChanges(this.currentGroup.name, this.topTensMap.get(category).get(this.currentUser)).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Your changes have been saved!");
        this.categoryLogistics[index].isEditing = false;
        this.statusMap.set(category + "-edit", false);
        this.refresh();
      } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
        this.displayToast("There is a problem with your group membership.", true)
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        console.log(res);
        this.displayToast("There was a problem.", true)
      }
    });
  }

  moveUp(category: string, catIndex: number, entryIndex: number) {
    // Swap entry with the entry above it
    let entries = this.topTensMap.get(category).get(this.categoryLogistics[catIndex]['member'])['entries'];
    let tmp = entries[entryIndex]
    entries[entryIndex] = entries[entryIndex - 1]
    entries[entryIndex - 1] = tmp
  }

  moveDown(category: string, catIndex: number, entryIndex: number) {
    // Swap entry with the entry below it
    let entries = this.topTensMap.get(category).get(this.categoryLogistics[catIndex]['member'])['entries'];
    let tmp = entries[entryIndex]
    entries[entryIndex] = entries[entryIndex + 1]
    entries[entryIndex + 1] = tmp
  }

  addNewEntry(category: string, catIndex: number, entryIndex: number) {
    // Add new entry to top tens category
    let entries = this.topTensMap.get(category).get(this.categoryLogistics[catIndex]['member'])['entries'];
    let newViewerPrefs = [];
    for (let viewerPref of entries[0].viewerPrefs) {
      newViewerPrefs.push({ member: viewerPref.member, shouldHide: false });
    }
    let newEntry = {name: "", viewerPrefs: newViewerPrefs}
    entries = entries.splice(entryIndex + 1, 0, newEntry)
  }

  removeEntry(category: string, catIndex: number, entryIndex: number) {
    // Remove entry from top tens category
    let entries = this.topTensMap.get(category).get(this.categoryLogistics[catIndex]['member'])['entries'];
    entries = entries.splice(entryIndex , 1)
  }
  private generateLogistics() {
    this.categoryLogistics = [];
    for (let category of this.allCategories) {
      let isEditing = false;
      if (this.statusMap.get(category.category + "-edit")) {
        isEditing = true;
      }
      this.categoryLogistics.push({member: this.currentUser, isEditing: isEditing});
    }
  }

  private organizeTopTens() {
    // Separate top tens into lists for each category & member
    if (!this.topTensMap.size) {
      this.topTensMap = new Map();
    }
    for (let toptensObj of this.allTopTens) {
      // Ignore category labels
      if (toptensObj.hasNoContent) {
        continue;
      }
      if (!this.topTensMap.get(toptensObj.category)) {
        let newMap = new Map<string, TopTens>();
        newMap.set(toptensObj.user, toptensObj);
        this.topTensMap.set(toptensObj.category, newMap);
      } else if (!this.topTensMap.get(toptensObj.category).get(toptensObj.user) || !this.statusMap.get(toptensObj.category + "-edit")) {
        this.topTensMap.get(toptensObj.category).set(toptensObj.user, toptensObj);
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

    this.isLoading = false
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
            this.refresh();
          } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
            this.displayToast("There is a problem with your group membership.", true)
          } else if (res["message"] == "Token") {
            this.displayToast("Your session has expired. Please refresh and log back in.", true);
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

  getDateString(datestr: string) {
    let date = new Date(datestr);
    return date.toDateString();
  }

  applyFilters() {
    this.updateCategorySearch();
    this.filterByLastEditedDate();
  }

  updateCategorySearch() {
    // Filter out categories that don't match our search text
    // In order to match, all words in search bar must be present, meaning each
    // word is at least a prefix of a word in some part of a category's name
    this.allCategories = this.allCategoriesFull.filter(category => {
      if (this.filterText === "") {
        return true;
      }
      for (let filterWord of this.filterText.split(" ")) {
        if (filterWord.trim() === "") {
          continue;
        }
        let wordFound = false;
        for (let word of category.category.toLowerCase().split(" ")) {
          if (word.startsWith(filterWord.toLowerCase().trim())) {
            wordFound = true;
          }
        }
        if (!wordFound) {
          return false;
        }
      }
      return true;
    });
  }

  filterByLastEditedDate() {
    if (this.dateFilter !== "-1") {
      this.allCategories = this.allCategories.filter(category => {
        let lastEditedDate = this.topTensMap.get(category.category).get(this.currentUser).lastEditedDate;
        if (!lastEditedDate) {
          return true;
        }
        let today = new Date();
        let categoryDate = new Date(lastEditedDate.toString());
        categoryDate.setMonth(categoryDate.getMonth() + parseInt(this.dateFilter));
        return (categoryDate < today);
      })
    }
  }

  private cacheSelectedAnime() {
    // Remember which anime were selected
    for (let category of this.allCategories) {
      if (category.isSelected) {
        this.statusMap.set(category.category + "-selected", true);
      } else {
        this.statusMap.set(category.category + "-selected", false);
      }
    }
  }

  private rememberSelectedAnime() {
    // See cacheSelectedAnime -- this is the opposite side
    for (let category of this.allCategories) {
      if (this.statusMap.get(category.category + "-selected")) {
        category.isSelected = true;
      }
    }
  }

  private refresh() {
    this.refreshHeader = Math.random();

    // Make sure we remember which top tens were open
    if (this.allCategories.length) {
      this.cacheSelectedAnime();
    }

    this.toptensService.getTopTensInfo(this.currentGroup.name).subscribe((res) => {
      if (res["success"]) {
        this.allCategories = res["allCategories"];
        this.allCategoriesFull = res["allCategories"];
        this.allTopTens = res["allTopTens"];
        this.rememberSelectedAnime();
        this.generateLogistics();
        this.organizeTopTens();
        this.applyFilters();
      } else if (res["message"] == "No group found" || res["message"] == "Invalid group membership") {
        this.displayToast("There is a problem with your group membership.", true)
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
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
    this.currentGroup = new Group("",[], { name: "", date: null });
    this.newCategoryName = "";
    this.allTopTens = [];
    this.topTensMap = new Map();
    this.allCategories = [];
    this.categoryLogistics = [];
    this.statusMap = new Map<string, boolean>();
    this.oldVersionMap = new Map<string, TopTens>();
    this.totalOrderMode = false;
    this.isLoading = true;
    this.hideSelectorPanel = false;
    this.dateFilter = "-1";
    this.dateFilterOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    this.filterText = "";

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
