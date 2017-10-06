import { Component, OnInit, Inject } from '@angular/core';
import { Anime } from '../anime';
import { MdDialogRef, MdDialog, MD_DIALOG_DATA } from '@angular/material';
import { AnimeService } from '../services/anime.service';

@Component({
  selector: 'home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  wantToWatchList: Anime[];
  consideringList: Anime[];
  completedList: Anime[];
  selectionList: Anime[];
  showAddAnimePrompt: boolean;   // If true, "Add anime" prompt is visible
  linkAnimeSuggestions: Anime[];
  animeToAdd: Anime;   // This is the anime the user is in the process of adding, if any
  selectedAnime: Anime;   // Currently selected anime that we show details for
  canSelectAsFinalist: boolean;
  // We do simple toasts without outside packages
  showToast: boolean;
  toastMessage: string;

  sortCriteria: string;

  private displayToast(message: string) {
    // Display toast in application with message and timeout after 3 sec
    this.showToast = true;
    this.toastMessage = message;
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
    }, 3000);
  }

  openAddAnimePrompt() {
    this.showAddAnimePrompt = true;
  }
  closeAddAnimePrompt() {
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime("");
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
          this.displayToast("No results found.")
          return;
        } else {
          this.displayToast("There was a problem.")
          console.log(res["message"]);
        }
      } else {
        const animeList = res["data"];

        // Display the top 5 suggestions
        // IDEA: In the future, it would be nice to have user preferences for how many
        // anime they would like to have show up during the link step
        const numSuggestions = Math.min(5, animeList.length);
        // Special case is where there is only 1 entry, in which case it is not an array
        if (animeList.hasOwnProperty("title")) {
          this.linkAnimeSuggestions.push(new Anime(animeList["title"], animeList["synopsis"], animeList["score"], animeList["image"], animeList["id"]));
        }
        for (let i=0; i<numSuggestions; i++) {
          // IDEA: Option in user settings for specifying English vs Japanese title when linked
          // NOTE: I thought I saw that sometimes the "score" property is an array for MAL API, so watch for an error with that
          this.linkAnimeSuggestions.push(new Anime(animeList[i]["title"], animeList[i]["synopsis"], animeList[i]["score"], animeList[i]["image"], animeList[i]["id"]))
        }
        // Open dialog
        let dialogRef = this.dialog.open(LinkAnimeDialog, {
          width: '1000px',
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

  addAnimeToWW() {
    // Add anime to database under 'Want to Watch'
    this.animeService.addAnimeToCatalog(this.animeToAdd, "Want to Watch").subscribe(res => {
      if (res["success"]) {
        this.refresh();
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }
    });
  }

  addAnimeToConsidering() {
    // Add anime to database under 'Considering'
    this.animeService.addAnimeToCatalog(this.animeToAdd, "Considering").subscribe(res => {
      if (res["success"]) {
        this.refresh();
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }
    });
  }

  addAnimeToCompleted() {
    // Add anime to database under 'Considering'
    this.animeService.addAnimeToCatalog(this.animeToAdd, "Completed").subscribe(res => {
      if (res["success"]) {
        this.refresh();
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }
    });
  }

  private validateSelectAsFinalistButton() {
    // Custom validation for 'select as finalist' button
    if (this.selectedAnime["category"] != "Completed") {
      this.canSelectAsFinalist = true;
      for (let anime of this.selectionList) {
        if (this.selectedAnime["mongoID"] == anime["mongoID"]) {
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
      this.selectionList.push(this.selectedAnime);
      this.validateSelectAsFinalistButton();
    });
  }

  removeAnimeFromCatalog() {
    // remove anime from database
    this.animeService.removeAnimeFromCatalog(this.selectedAnime["mongoID"]).subscribe(res => {
      if (res["success"]) {
        this.refresh();
        this.selectedAnime = new Anime("");
        this.displayToast("Anime successfully removed!");
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }
    });
  }

  changeCategory(newCategory: string) {
    // Update database entry to reflect category change of anime
    this.animeService.changeCategory(this.selectedAnime["mongoID"], newCategory).subscribe(res => {
      if (res["success"]) {
        // Have to manually update currently selected anime's category
        this.selectedAnime["category"] = newCategory;
        this.refresh();
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }
    })
  }

  editComments(index: number) {
    // Bring up the dialog for editing the comments of a finalist
    let dialogRef = this.dialog.open(FinalistCommentsDialog, {
      width: '300px',
      data: {comments: this.selectionList[index]["comments"].join(";")}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectionList[index]["comments"] = result.split(";");
      }
    });
  }

  removeFinalist(index: number) {
    // IDEA: Change title of chooser tool depending on # of anime left
    this.selectionList.splice(index,1);
    this.validateSelectAsFinalistButton();
  }

  private refresh() {
    // Fetch all anime stored in database and update our lists
    this.wantToWatchList = [];
    this.consideringList = [];
    this.completedList = [];
    this.selectionList = [];
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime("");

    this.animeService.fetchAnime().subscribe(res => {
      if (res["success"]) {
        const wwAnime = res["wwAnime"];
        const cAnime = res["cAnime"];
        const compAnime = res["compAnime"];
        for (let i=0; i<wwAnime.length; i++) {
          this.wantToWatchList.push(new Anime(wwAnime[i]["name"], wwAnime[i]["description"], wwAnime[i]["rating"], wwAnime[i]["thumbnail"], wwAnime[i]["malID"], wwAnime[i]["category"], wwAnime[i]["_id"]));
        }
        for (let i=0; i<cAnime.length; i++) {
          this.consideringList.push(new Anime(cAnime[i]["name"], cAnime[i]["description"], cAnime[i]["rating"], cAnime[i]["thumbnail"], cAnime[i]["malID"], cAnime[i]["category"], cAnime[i]["_id"]));
        }
        for (let i=0; i<compAnime.length; i++) {
          this.completedList.push(new Anime(compAnime[i]["name"], compAnime[i]["description"], compAnime[i]["rating"], compAnime[i]["thumbnail"], compAnime[i]["malID"], compAnime[i]["category"], compAnime[i]["_id"]));
        }
      } else {
        this.displayToast("There was a problem.")
        console.log(res["message"]);
      }

    });
  }

  constructor(
    private dialog: MdDialog,
    private animeService: AnimeService
  ) {}

  ngOnInit() {
    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    this.animeToAdd = new Anime("");
    this.selectedAnime = new Anime("");
    this.sortCriteria = "mongoID,ascending"
    this.showToast = false;
    this.toastMessage = "";
    this.refresh();
  }
}

@Component({
  selector: 'link-anime',
  templateUrl: './link-anime.html',
})
export class LinkAnimeDialog {
  constructor(
    public dialogRef: MdDialogRef<LinkAnimeDialog>,
    @Inject(MD_DIALOG_DATA) public data: any
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
    public dialogRef: MdDialogRef<FinalistCommentsDialog>,
    @Inject(MD_DIALOG_DATA) public data: any
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
}
