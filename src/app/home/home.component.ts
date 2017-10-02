import { Component, OnInit } from '@angular/core';
import { Anime } from '../anime';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  wantToWatchList: Anime[];
  consideringList: Anime[];
  testNumber: number;
  addAnimePromptOpen: boolean;

  openAddAnimePrompt() {
    this.addAnimePromptOpen = true;
  }
  closeAddAnimePrompt() {
    this.addAnimePromptOpen = false;
  }
  malTest() {
    this.http.get("/api/malTest").subscribe(res => {
      console.log(JSON.parse(res.toString()));
    });
  }

  constructor(private http: HttpClient
    // Don't really need anything here yet
  ) {}

  ngOnInit() {
    this.addAnimePromptOpen = false;
    this.wantToWatchList = [];
    this.consideringList = [];
    // Start by fetching all anime stored in database and update our lists
    this.http.get("/api/fetchAnime").subscribe(res => {
      // TODO: Do some validation here so we don't error out
      for (let i=0; i<res["data"]["wwAnime"].length; i++) {
        this.wantToWatchList.push(new Anime(res["data"]["wwAnime"][i]["name"]));
      }
      for (let i=0; i<res["data"]["cAnime"].length; i++) {
        this.consideringList.push(new Anime(res["data"]["cAnime"][i]["name"]));
      }
    });

    console.log("HomeComponent has been instantiated");
  }
}
