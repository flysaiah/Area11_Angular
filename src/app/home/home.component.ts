import { Component, OnInit, Inject } from '@angular/core';
import { Anime } from '../anime';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { MdDialogRef, MdDialog, MD_DIALOG_DATA } from '@angular/material';

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
  selectedAnimeCategory: string;   // "Want to Watch", "Considering", or "Completed"
  canSelectAsFinalist: boolean;

  sortCriteria: string;

  openAddAnimePrompt() {
    this.showAddAnimePrompt = true;
  }
  closeAddAnimePrompt() {
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime("", "", -1, "", -1);
  }
  showAnimeDetails(anime: Anime, category: string) {
    this.selectedAnime = anime;
    this.selectedAnimeCategory = category;
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
    // TODO: Refactor this into a service?

    if (!this.animeToAdd["name"]) {
      // TODO: Better validation than this
      console.log("Empty query");
      return;
    }
    this.http.post("/api/malSearch", {query: this.animeToAdd["name"]}).subscribe(res => {
      if (res.hasOwnProperty("hasFailed")) {
        // MAL query fails if no results
        if (res["reason"] == "noResults") {
          // TODO: Handle this better, maybe with toast dialog
          console.log("No results");
          return;
        } else {
          console.log("Error in /api/malSearch");
        }
      } else {
        console.log(JSON.parse(res.toString()));
        const animeList = JSON.parse(res.toString())["anime"]["entry"];

        // Display the top 5 suggestions
        // IDEA: In the future, it would be nice to have user preferences for how many
        // anime they would like to have show up during the link step
        const numSuggestions = Math.min(5, animeList.length);
        // Special case is where there is only 1 entry, in which case it is not an array
        if (animeList.hasOwnProperty("title")) {
          this.linkAnimeSuggestions.push(new Anime(animeList["title"], animeList["synopsis"], animeList["score"], animeList["image"], animeList["id"]));
        }
        for (let i=0; i<numSuggestions; i++) {
          // IDEA: Option for specifying English vs Japanese title or even just keep their own name
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
          }
          // Make sure to reset suggestion list
          this.linkAnimeSuggestions = [];
          // TODO: Need to let user know their anime has been linked
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
    // TODO: Probably refactor into service
    this.http.post("/api/addAnimeToCatalog", {category: "Want to Watch", anime: this.animeToAdd}).subscribe(res => {
      this.refresh();
    });
  }

  addAnimeToConsidering() {
    // TODO: Probably refactor into service
    // Add anime to database under 'Considering'
    this.http.post("/api/addAnimeToCatalog", {category: "Considering", anime: this.animeToAdd}).subscribe(res => {
      this.refresh();
    });
  }

  addAnimeToCompleted() {
    // TODO: Probably refactor into service
    // Add anime to database under 'Considering'
    this.http.post("/api/addAnimeToCatalog", {category: "Completed", anime: this.animeToAdd}).subscribe(res => {
      this.refresh();
    });
  }

  private validateSelectAsFinalistButton() {
    // Custom validation for 'select as finalist' button
    if (this.selectedAnimeCategory != "Completed") {
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
    // TODO: Confirmation dialog (possibly)
    // TODO: Toast for each of these adds/deletes if they were not successful
    this.http.post("/api/removeAnimeFromCatalog", {id: this.selectedAnime["mongoID"]}).subscribe(res => {
      this.refresh();
      this.selectedAnime = new Anime("", "", -1, "", -1);
      this.selectedAnimeCategory = "";
    });
  }

  changeCategory(newCategory: string) {
    // Update database entry to reflect category change of anime
    this.http.post("/api/changeCategory", {id: this.selectedAnime["mongoID"], category: newCategory}).subscribe(res => {
      this.refresh();
      this.selectedAnimeCategory = newCategory;
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
    // TODO: Cool toast here
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
    this.animeToAdd = new Anime("", "", -1, "", -1);

    this.http.get("/api/fetchAnime").subscribe(res => {
      // TODO: Do some validation here so we don't error out
      const wwAnime = res["data"]["wwAnime"];
      const cAnime = res["data"]["cAnime"];
      const compAnime = res["data"]["compAnime"];
      for (let i=0; i<wwAnime.length; i++) {
        this.wantToWatchList.push(new Anime(wwAnime[i]["name"], wwAnime[i]["description"], wwAnime[i]["rating"], wwAnime[i]["thumbnail"], wwAnime[i]["malID"], wwAnime[i]["_id"]));
      }
      for (let i=0; i<cAnime.length; i++) {
        this.consideringList.push(new Anime(cAnime[i]["name"], cAnime[i]["description"], cAnime[i]["rating"], cAnime[i]["thumbnail"], cAnime[i]["malID"], cAnime[i]["_id"]));
      }
      for (let i=0; i<compAnime.length; i++) {
        this.completedList.push(new Anime(compAnime[i]["name"], compAnime[i]["description"], compAnime[i]["rating"], compAnime[i]["thumbnail"], compAnime[i]["malID"], compAnime[i]["_id"]));
      }
    });
  }

  constructor(
    private http: HttpClient,
    private dialog: MdDialog
  ) {}

  ngOnInit() {
    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    this.animeToAdd = new Anime("", "", -1, "", -1)   // -1 will be the default "has not been assigned for Anime number properties"
    this.selectedAnime = new Anime("", "", -1, "", -1);
    this.selectedAnimeCategory = "";
    this.sortCriteria = "mongoID,ascending"
    this.refresh();
  }
}

// TODO: Check best practices guide to see if this belongs in a separate file
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
