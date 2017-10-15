import { Component, OnInit, Inject } from '@angular/core';
import { Anime } from '../anime';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { AnimeService } from '../services/anime.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  wantToWatchList: Anime[];
  consideringList: Anime[];
  completedList: Anime[];
  finalistList: Anime[];
  showAddAnimePrompt: boolean;   // If true, "Add anime" prompt is visible
  linkAnimeSuggestions: Anime[];
  animeToAdd: Anime;   // This is the anime the user is in the process of adding, if any
  selectedAnime: Anime;   // Currently selected anime that we show details for
  canSelectAsFinalist: boolean;
  possibleCategories: string[];
  // We do simple toasts without outside packages
  showToast: boolean;
  toastMessage: string;
  toastError: boolean;
  sortCriteria: string;
  currentUser: string;

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

  openAddAnimePrompt() {
    this.showAddAnimePrompt = true;
  }
  closeAddAnimePrompt() {
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime(this.currentUser, "");
  }
  showAnimeDetails(anime: Anime) {
    this.selectedAnime = anime;
    this.validateSelectAsFinalistButton();
  }

  private sortByField(fieldName, direction) {
    // Returns comparator to sort an array of object by fieldName
    // Direction specifies ascending vs descending
    if (direction == "ascending") {
      return function (a,b) {
        return (a[fieldName] < b[fieldName]) ? -1 : (a[fieldName] > b[fieldName]) ? 1 : 0;
      }
    }
    return function (a,b) {
      return (a[fieldName] > b[fieldName]) ? -1 : (a[fieldName] < b[fieldName]) ? 1 : 0;
    }

  }

  malSearch() {
    this.animeService.malSearch(this.animeToAdd["name"]).subscribe(res => {
      if (!res["success"]) {
        // MAL API is weird because if there are no results it yields a parse error
        if (res["message"] == "Error: Parse Error") {
          this.displayToast("No results found.", true)
          return;
        } else {
          this.displayToast("There was a problem.", true)
          console.log(res["message"]);
        }
      } else {
        const animeList = res["data"];

        // Display the top 30 suggestions
        // IDEA: In the future, it would be nice to have user preferences for how many
        // anime they would like to have show up during the link step
        const numSuggestions = Math.min(30, animeList.length);
        // Special case is where there is only 1 entry, in which case it is not an array
        if (animeList.hasOwnProperty("title")) {
          this.linkAnimeSuggestions.push(new Anime(this.currentUser, animeList["title"], animeList["synopsis"], animeList["score"], animeList["image"], animeList["id"], animeList["genres"]));
        }
        for (let i=0; i<numSuggestions; i++) {
          // IDEA: Option in user settings for specifying English vs Japanese title when linked
          // NOTE: I thought I saw that sometimes the "score" property is an array for MAL API, so watch for an error with that
          this.linkAnimeSuggestions.push(new Anime(this.currentUser, animeList[i]["title"], animeList[i]["synopsis"], animeList[i]["score"], animeList[i]["image"], animeList[i]["id"], animeList[i]["genres"]))
        }
        // Open dialog
        let dialogRef = this.dialog.open(LinkAnimeDialog, {
          width: '515px',
          data: {suggestions: this.linkAnimeSuggestions}
        });

        dialogRef.afterClosed().subscribe(result => {
          // Result is the index of the anime they chose to link, if they chose to link one
          if (result || result == 0) {
            this.animeToAdd = this.linkAnimeSuggestions[result];
            this.displayToast("Anime successfully linked!")
          }
          // Make sure to reset suggestion list
          this.linkAnimeSuggestions = [];
        });
      }
    });
  }

  sortAnime(criteria) {
    // Sort all anime lists by the criteria picked in the toolbar select
    const c1 = criteria.split(",")[0];
    const c2 = criteria.split(",")[1];
    this.wantToWatchList.sort(this.sortByField(c1, c2));
    this.consideringList.sort(this.sortByField(c1, c2));
    this.completedList.sort(this.sortByField(c1, c2));
  }

  addAnimeToCatalog(category?: string) {
    // Add anime to database under 'Want to Watch'
    if (category) {
      this.animeToAdd['category'] = category;
    }
    this.animeService.addAnimeToCatalog(this.animeToAdd).subscribe(res => {
      if (res["success"]) {
        this.refresh();
      } else if (res["message"] == "Anime already in catalog") {
          this.displayToast(res["message"], true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
  }

  private validateSelectAsFinalistButton() {
    // Custom validation for 'select as finalist' button
    if (this.selectedAnime["category"] != "Completed") {
      this.canSelectAsFinalist = true;
      for (let anime of this.finalistList) {
        if (this.selectedAnime["_id"] == anime["_id"]) {
          this.canSelectAsFinalist = false;
          break;
        }
      }
    }
  }

  selectAsFinalist() {
    // Add selected anime to chooser panel
    // First bring up a dialog to allow them to enter any comments
    let dialogRef = this.dialog.open(FinalistCommentsDialog, {
      width: '300px',
      data: {comments: ""}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedAnime["comments"] = result.split(";");
      }
      this.animeService.selectAsFinalist(this.selectedAnime["_id"], this.selectedAnime["comments"]).subscribe((res) => {
        if (!res["success"]) {
          this.displayToast("There was a problem.", true);
        }
      })
      this.refresh();
    });
  }

  removeAnimeFromCatalog() {
    // remove anime from database
    this.animeService.removeAnimeFromCatalog(this.selectedAnime["_id"]).subscribe(res => {
      if (res["success"]) {
        this.refresh();
        this.selectedAnime = new Anime(this.currentUser, "");
        this.displayToast("Anime successfully removed!");
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
  }

  changeCategory(newCategory: string) {
    // Update database entry to reflect category change of anime
    this.animeService.changeCategory(this.selectedAnime["_id"], newCategory).subscribe(res => {
      if (res["success"]) {
        // Have to manually update currently selected anime's category
        this.selectedAnime["category"] = newCategory;
        this.refresh();
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    })
  }

  editComments(index: number) {
    // Bring up the dialog for editing the comments of a finalist
    let dialogRef = this.dialog.open(FinalistCommentsDialog, {
      width: '300px',
      data: {comments: this.finalistList[index]["comments"].join(";")}
    });
    dialogRef.afterClosed().subscribe(result => {
      // result = comment string
      if (result) {
        this.finalistList[index]["comments"] = result.split(";");
      } else if (result == "") {
        this.finalistList[index]["comments"] = [];
      } else {
        // No changes were made--they hit the cancel button
        return;
      }
      const tmp = this.finalistList[index];
      this.animeService.selectAsFinalist(tmp["_id"], tmp["comments"]).subscribe((res) => {
        if (!res["success"]) {
          console.log(res);
          this.displayToast("There was a problem.", true);
        }
      });
    });
  }

  removeFinalist(index: number) {
    this.animeService.removeFinalist(this.finalistList[index]["_id"]).subscribe((res) => {
      if (res["success"]) {
        this.refresh(true);
      } else {
        console.log(res);
        this.displayToast("There was a problem", true);
      }
    });
  }

  viewFinalist(index: number) {
    this.showAnimeDetails(this.finalistList[index]);
  }



  private refresh(showFinalistMessage?: boolean) {
    // Fetch all anime stored in database and update our lists
    this.wantToWatchList = [];
    this.consideringList = [];
    this.completedList = [];
    this.finalistList = [];
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime(this.currentUser, "");

    this.animeService.fetchAnime(this.currentUser).subscribe(res => {
      if (res["success"]) {
        const animeList = res["animeList"];
        for (let anime of animeList) {
          if (anime["category"] == "Want to Watch") {
            this.wantToWatchList.push(anime);
          } else if (anime["category"] == "Considering") {
            this.consideringList.push(anime);
          } else if (anime["category"] == "Completed") {
            this.completedList.push(anime);
          }
          if (anime["isFinalist"]) {
            this.finalistList.push(anime);
          }
        }
        // If we have finalists, make sure we disable the "Add as Finalist" button for those
        if (this.finalistList.length) {
          this.validateSelectAsFinalistButton();
          if (showFinalistMessage) {
            // If this was triggered by removing a finalist, then toast
            switch (this.finalistList.length) {
              case 4: {
                this.displayToast("It's down to the Elite Four!");
                break;
              } case 2: {
                this.displayToast("It's down to the finals!");
                break;
              } case 1: {
                this.displayToast("Congratulations to the victor!");
                break;
              } default: {
                // do nothing
              }
            }
          }
        }
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }

    });
  }

  constructor(
    private dialog: MatDialog,
    private animeService: AnimeService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.wantToWatchList = [];
    this.consideringList = [];
    this.completedList = [];
    this.finalistList = [];

    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    this.animeToAdd = new Anime("", "");
    this.selectedAnime = new Anime("", "");
    this.sortCriteria = "_id,ascending"
    this.possibleCategories = ["Want to Watch", "Considering", "Completed"];
    this.showToast = false;
    this.toastMessage = "";

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.animeToAdd["user"] = this.currentUser;
        this.selectedAnime["user"] = this.currentUser;
        this.refresh();
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res["message"]);
      }
    });
  }
}

@Component({
  selector: 'link-anime',
  templateUrl: './link-anime.html',
  styleUrls: ['./link-anime.css']
})
export class LinkAnimeDialog {
  constructor(
    public dialogRef: MatDialogRef<LinkAnimeDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'finalist-comments',
  templateUrl: './finalist-comments.html'
})
export class FinalistCommentsDialog {
  constructor(
    public dialogRef: MatDialogRef<FinalistCommentsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
}
