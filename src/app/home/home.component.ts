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
  showAddAnimePrompt: boolean;   // If true, "Add anime" prompt is visible
  linkAnimeSuggestions: Anime[];
  animeToAdd: Anime;   // This is the anime the user is in the process of adding, if any
  selectedAnime: Anime;   // Currently selected anime that we show details for

  openAddAnimePrompt() {
    this.showAddAnimePrompt = true;
  }
  closeAddAnimePrompt() {
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime("", "", -1, "", -1);
  }
  showAnimeDetails(anime: Anime) {
    this.selectedAnime = anime;
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
        const animeList = JSON.parse(res.toString())["anime"]["entry"];

        // Display the top 5 suggestions
        // IDEA: In the future, it would be nice to have user preferences for how many
        // anime they would like to have show up during the link step

        const numSuggestions = Math.min(5, animeList.length);
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

  addAnimeToWW() {
    // Add anime to database under 'Want to Watch'
    // TODO: Probably refactor into service
    this.http.post("/api/addAnimeToCatalog", {category: "Want to Watch", anime: this.animeToAdd}).subscribe(res => {
      console.log(res);
      this.refresh();
    });
    this.showAddAnimePrompt = false;
    // NOTE: This redundant reset may be unnecessary
    this.animeToAdd = new Anime("", "", -1, "", -1);
  }

  addAnimeToConsidering() {
    // TODO: Probably refactor into service
    // Add anime to database under 'Considering'
    this.http.post("/api/addAnimeToCatalog", {category: "Considering", anime: this.animeToAdd}).subscribe(res => {
      this.refresh();
    });
    this.showAddAnimePrompt = false;
    // NOTE: This redundant reset may be unnecessary
    this.animeToAdd = new Anime("", "", -1, "", -1);
  }

  refresh() {
    // Fetch all anime stored in database and update our lists
    this.wantToWatchList = [];
    this.consideringList = [];
    this.http.get("/api/fetchAnime").subscribe(res => {
      // TODO: Do some validation here so we don't error out
      const wwAnime = res["data"]["wwAnime"];
      const cAnime = res["data"]["cAnime"];
      for (let i=0; i<wwAnime.length; i++) {
        this.wantToWatchList.push(new Anime(wwAnime[i]["name"], wwAnime[i]["description"], wwAnime[i]["rating"], wwAnime[i]["thumbnail"], wwAnime[i]["malID"]));
      }
      for (let i=0; i<cAnime.length; i++) {
        this.consideringList.push(new Anime(cAnime[i]["name"], cAnime[i]["description"], cAnime[i]["rating"], cAnime[i]["thumbnail"], cAnime[i]["malID"]));
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
