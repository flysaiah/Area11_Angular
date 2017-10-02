import { Component, OnInit } from '@angular/core';
import { Anime } from '../anime'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  wantToWatchList: Anime[];
  consideringList: Anime[];
  testNumber: number;
  constructor(private http: HttpClient
    // Don't really need anything here yet
  ) {}

  ngOnInit() {
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
