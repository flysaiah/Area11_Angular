import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { InfolistService } from '../services/infolist.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Infolist } from './infolist';
import { ConfirmDialog } from '../app.component';

@Component({
  selector: 'app-infolists',
  templateUrl: './infolists.component.html',
  styleUrls: ['./infolists.component.scss']
})
export class InfolistsComponent implements OnInit {

  currentUser: string;
  refreshHeader: number;
  isLoading: boolean;

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  newInfolistName: string;
  currentlyAddingNewInfolist: boolean;

  allInfolists: Infolist[];
  allInfolistNames: string[];   // Used for validation

  paginatorOptionsMap: Object;
  paginatorCurrentIndexMap: Object;

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

  viewAll() {
    this.allInfolists.map((ilObj) => {
      ilObj.isSelected = true;
      return ilObj;
    })
  }

  hideAll() {
    this.allInfolists.map((ilObj) => {
      ilObj.isSelected = false;
      return ilObj;
    })
  }

  deleteEmptyRows(infolist: Infolist) {
    // delete all empty rows in infolist unless only 1 row exists
    if (!infolist.entries || infolist.entries.length < 2) {
      return;
    }
    infolist.entries = infolist.entries.filter((entry) => {
      if (!entry.anime && !entry.info) {
        return false;
      }
      return true;
    });
    // Guard against paginator becoming inconsistent
    if (1 + this.paginatorCurrentIndexMap[infolist.name] * this.paginatorOptionsMap[infolist.name] > (this.paginatorOptionsMap[infolist.name] * (1 + this.paginatorCurrentIndexMap[infolist.name]) > infolist.entries.length ? infolist.entries.length : this.paginatorOptionsMap[infolist.name] * (1 + this.paginatorCurrentIndexMap[infolist.name]))) {
      this.paginatorCurrentIndexMap[infolist.name] -= 1;
    }
  }

  addNewEntry(infolist: Infolist) {
    let newBlankEntry = {
      anime: "",
      info: ""
    }
    infolist.entries.push(newBlankEntry);
  }

  renameInfolist(infolist: Infolist) {
    let dialogRef = this.dialog.open(RenameInfolistDialog, {
      width: '250px',
      data: {newName: ""}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (typeof result != "undefined") {
        if (result) {
          this.infolistService.saveInfolist(infolist, result).subscribe((res) => {
            if (res.success) {
              let oldName = infolist.name;
              infolist.name = res.infolist.name;
              this.allInfolistNames[this.allInfolistNames.indexOf(infolist.name)] = res.infolist.name;
              this.paginatorOptionsMap[infolist.name] = this.paginatorOptionsMap[oldName];
              delete this.paginatorOptionsMap[oldName];
              this.paginatorCurrentIndexMap[infolist.name] = this.paginatorCurrentIndexMap[oldName];
              delete this.paginatorCurrentIndexMap[oldName];
              this.displayToast("Info List renamed successfully!");
            } else {
              console.log(res);
              this.displayToast("There was a problem renaming your Info List.", true);
            }
          });
        } else {
          this.displayToast("The new Info List name can't be empty.", true);
        }
      }
    });
  }

  addNewInfolist() {
    this.currentlyAddingNewInfolist = true;
    let newInfolist = {
      "name": this.newInfolistName,
      "entries": []
    }
    this.infolistService.addNewInfolist(newInfolist).subscribe((res) => {
      if (res.success) {
        this.newInfolistName = "";
        this.allInfolists.push(res.infolist);
        this.allInfolistNames.push(res.infolist.name);
        this.updatePaginatorInfo();
      } else {
        console.log(res);
        this.displayToast("There was a problem adding a new info list.", true);
      }
      this.currentlyAddingNewInfolist = false;
    });
  }

  updatePaginatorInfo() {
    for (let infolist of this.allInfolists) {
      if (!this.paginatorOptionsMap[infolist.name]) {
        this.paginatorOptionsMap[infolist.name] = 10;
      }
      if (!this.paginatorCurrentIndexMap[infolist.name]) {
        this.paginatorCurrentIndexMap[infolist.name] = 0;
      }
    }
  }

  incrementPaginatorIndex(infolist: string) {
    this.paginatorCurrentIndexMap[infolist] += 1;
  }

  decrementPaginatorIndex(infolist: string) {
    this.paginatorCurrentIndexMap[infolist] -= 1;
  }

  rightmostPaginatorIndex(infolist: Infolist) {
    this.paginatorCurrentIndexMap[infolist.name] = Math.floor((infolist.entries.length - 1) / this.paginatorOptionsMap[infolist.name]);
  }

  leftmostPaginatorIndex(infolist: Infolist) {
    this.paginatorCurrentIndexMap[infolist.name] = 0;
  }

  getInfolistEntries(infolist: Infolist) {
    const currentIndex = this.paginatorCurrentIndexMap[infolist.name];
    const currentInterval = this.paginatorOptionsMap[infolist.name];
    const startIndex = currentIndex * currentInterval;
    const endIndex = currentInterval * (1 + currentIndex) > infolist.entries.length ? infolist.entries.length : currentInterval * (1 + currentIndex)
    return infolist.entries.slice(startIndex, endIndex);
  }

  sortByName(infolist: Infolist, descending?: boolean) {
    // Sort infolist by left column (Anime Name)
    infolist.entries.sort((entry1, entry2) => {
      if (descending) {
        return entry1.anime < entry2.anime ? 1 : -1;
      } else {
        return entry1.anime < entry2.anime ? -1 : 1;
      }
    });
  }

  saveChanges(infolist: Infolist) {
    this.deleteEmptyRows(infolist);
    this.infolistService.saveInfolist(infolist).subscribe((res) => {
      if (res.success) {
        this.displayToast("Info List saved successfully!");
      } else {
        console.log(res);
        this.displayToast("There was a problem saving your info list.", true);
      }
    });
  }

  deleteInfolist(infolist: Infolist, index: number) {
    let dialogRef = this.dialog.open(ConfirmDialog, {
      data: {}
    });

    dialogRef.afterClosed().subscribe((result) => {
      // Result is the index of the anime they chose to link, if they chose to link one
      if (result) {
        this.infolistService.deleteInfolist(infolist).subscribe((res) => {
          if (res.success) {
            this.allInfolists.splice(index, 1);
            this.allInfolistNames.splice(index, 1);
          } else {
            console.log(res);
            this.displayToast("There was a problem deleting the info list.", true);
          }
        });
      }
    });
  }

  private generateInfolistNames() {
    this.allInfolistNames = [];
    for (let infolist of this.allInfolists) {
      this.allInfolistNames.push(infolist.name);
    }
  }
  refresh() {
    this.infolistService.fetchInfolists().subscribe((res) => {
      if (res.success && res.infolists) {
        this.allInfolists = res.infolists
        this.generateInfolistNames();
        this.updatePaginatorInfo();
        this.isLoading = false;
      } else if (!res.success) {
        this.displayToast("There was a problem getting your info lists.", true);
        console.log(res);
      }
    });
  }

  constructor(
    private authService: AuthService,
    private infolistService: InfolistService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.allInfolists = [];
    this.allInfolistNames = [];
    this.currentlyAddingNewInfolist = false;
    this.newInfolistName = "";

    this.paginatorOptionsMap = {};
    this.paginatorCurrentIndexMap = {};

    this.authService.getProfile().subscribe((res) => {
      if (res.success) {
        this.currentUser = res.user.username;
        this.refresh();
      } else {
        // If there was a problem we need to have them log in again
        console.log(res.message);
        this.authService.logout();
      }
    });
  }
}

@Component({
  selector: 'infolist-rename',
  templateUrl: './infolist-rename.html'
})
export class RenameInfolistDialog {
  constructor(
    public dialogRef: MatDialogRef<RenameInfolistDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
  @HostListener('document:keydown', ['$event'])
  handleKeypress(event: KeyboardEvent) {
    if (event.key == "Enter") {
      this.dialogRef.close(this.data.newName);
    }
  }
}
