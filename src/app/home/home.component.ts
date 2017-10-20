import { Component, OnInit, Inject } from '@angular/core';
import { Anime } from '../anime';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { AnimeService } from '../services/anime.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/map';

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
  showCategory: string;
  currentUser: string;

  searchAnimeCtl: FormControl;
  searchAnime: Anime[];
  filteredSearchAnime: Observable<any[]>;

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
    // Some elements like [i] and [/i] are used in description, so we replace with regex to ensure they render correctly
    if (this.selectedAnime["description"]) {
      this.selectedAnime["description"] = this.selectedAnime["description"].replace(/\[i\]/g, "\<i\>").replace(/\[\/i\]/g, "\</i\>")
    }
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

  watchOPs() {
    // Open youtube searches of each finalist in new tabs
    for (let anime of this.finalistList) {
      window.open("http://www.youtube.com/results?search_query=" + encodeURI(anime["name"] + " OP"), "_blank")
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
          let newAnime:Anime = {
            user: this.currentUser,
            name: (typeof animeList["title"] == "string" ? animeList["title"] : "Unknown").toString(),
            description: (typeof animeList["synopsis"] == "string" ? animeList["synopsis"] : "").toString(),
            rating: (typeof animeList["score"] == "string" ? animeList["score"] : "").toString(),
            thumbnail: (typeof animeList["image"] == "string" ? animeList["image"] : "").toString(),
            malID: (typeof animeList["id"] == "string" ? animeList["id"] : -1).toString(),
            startDate: (new Date(animeList["start_date"])).toLocaleDateString(),
            endDate: (new Date(animeList["end_date"])).toLocaleDateString(),
            type: (typeof animeList["type"] == "string" ? animeList["type"] : "").toString(),
            englishTitle: (typeof animeList["english"] == "string" ? animeList["english"] : "").toString(),
            status: (typeof animeList["status"] == "string" ? animeList["status"] : "").toString()
          }
          this.linkAnimeSuggestions.push(newAnime);
        }
        for (let i=0; i<numSuggestions; i++) {
          // IDEA: Option in user settings for specifying English vs Japanese title when linked
          // NOTE: I thought I saw that sometimes the "score" property is an array for MAL API, so watch for an error with that
          // We use all these conditionals because the MAL API is really weird and sometimes returns weird non-string results
          let newAnime:Anime = {
            user: this.currentUser,
            name: (typeof animeList[i]["title"] == "string" ? animeList[i]["title"] : "Unknown").toString(),
            description: (typeof animeList[i]["synopsis"] == "string" ? animeList[i]["synopsis"] : "").toString(),
            rating: (typeof animeList[i]["score"] == "string" ? animeList[i]["score"] : "").toString(),
            thumbnail: (typeof animeList[i]["image"] == "string" ? animeList[i]["image"] : "").toString(),
            malID: (typeof animeList[i]["id"] == "string" ? animeList[i]["id"] : -1).toString(),
            startDate: (new Date(animeList[i]["start_date"])).toLocaleDateString(),
            endDate: (new Date(animeList[i]["end_date"])).toLocaleDateString(),
            type: (typeof animeList[i]["type"] == "string" ? animeList[i]["type"] : "").toString(),
            englishTitle: (typeof animeList[i]["english"] == "string" ? animeList[i]["english"] : "").toString(),
            status: (typeof animeList[i]["status"] == "string" ? animeList[i]["status"] : "").toString()
          }
          this.linkAnimeSuggestions.push(newAnime);
        }
        console.log(this.linkAnimeSuggestions);
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
        if (this.selectedAnime["comments"][this.selectedAnime["comments"].length - 1] == "") {
          this.selectedAnime["comments"].splice(-1,1);
        }
      }
      this.animeService.selectAsFinalist(this.selectedAnime["_id"], this.selectedAnime["comments"]).subscribe((res) => {
        if (!res["success"]) {
          this.displayToast("There was a problem.", true);
        }
      })
      this.finalistList.push(this.selectedAnime);
      this.validateSelectAsFinalistButton();
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
        if (this.finalistList[index]["comments"][this.finalistList[index]["comments"].length - 1] == "") {
          this.finalistList[index]["comments"].splice(-1,1);
        }
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
        this.finalistList.splice(index, 1);
        this.validateSelectAsFinalistButton();
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
      } else {
        console.log(res);
        this.displayToast("There was a problem", true);
      }
    });
  }

  viewFinalist(index: number) {
    this.showAnimeDetails(this.finalistList[index]);
  }

  filterAnime(name: string) {
    return this.searchAnime.filter(anime =>
      anime.name.toLowerCase().indexOf(name.toLowerCase()) === 0);
    }

  refresh() {
    // Fetch all anime stored in database and update our lists
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime(this.currentUser, "");

    this.animeService.fetchAnime(this.currentUser).subscribe(res => {
      if (res["success"]) {
        const animeList = res["animeList"];
        const newWantToWatch = [];
        const newConsidering = [];
        const newCompleted = [];
        const newFinalistList = [];
        const newSearchAnimeList = [];
        for (let anime of animeList) {
          if (anime["category"] == "Want to Watch" && (this.showCategory == "All Categories" || this.showCategory == "Want to Watch")) {
            newWantToWatch.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Considering" && (this.showCategory == "All Categories" || this.showCategory == "Considering")) {
            newConsidering.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Completed" && (this.showCategory == "All Categories" || this.showCategory == "Completed")) {
            newCompleted.push(anime);
            newSearchAnimeList.push(anime);
          }
          if (anime["isFinalist"]) {
            newFinalistList.push(anime);
          }
        }
        this.wantToWatchList = newWantToWatch;
        this.consideringList = newConsidering;
        this.completedList = newCompleted;
        this.finalistList = newFinalistList;
        this.searchAnime = newSearchAnimeList;
        // If we have finalists, make sure we disable the "Add as Finalist" button for those
        if (this.finalistList.length) {
          this.validateSelectAsFinalistButton();
        }
        this.sortAnime(this.sortCriteria);
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

    this.searchAnimeCtl = new FormControl();
    this.filteredSearchAnime = this.searchAnimeCtl.valueChanges
      .startWith(null)
      .map(anime => anime ? this.filterAnime(anime) : this.searchAnime.slice());
    this.searchAnime = [];

    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    this.animeToAdd = new Anime("", "");
    this.selectedAnime = new Anime("", "");
    this.sortCriteria = "_id,ascending"
    this.showCategory = "All Categories";
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
