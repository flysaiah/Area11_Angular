import { Component, OnInit } from '@angular/core';

import { Anime } from '../anime';

import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { AnimeService } from '../services/anime.service';

// Fisher-Yates shuffle
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

@Component({
  selector: 'app-bracket-process',
  templateUrl: './bracket-process.component.html',
  styleUrls: ['./bracket-process.component.css']
})
export class BracketProcessComponent implements OnInit {

  currentUser: string;

  showToast: boolean;
  toastMessage: string;
  toastError: boolean;

  refreshHeader: number;
  isLoading: boolean;

  finalistList: Anime[][];
  validFinalists: boolean;   // Invalid if length < 8, length > 32, or duplicate seeds
  seedCount: number;   // Used so we don't skip a seed (in UI) if they forget to add one

  winner: string;

  enableFireworks: boolean;
  fireworks: boolean;   // If true, then fireworks animation plays

  // Helps determine where seeds & seed opponents should be
  SEEDMAP = {
    8: {1:0, 2:6, 3:4, 4:2, 5:3, 6:5, 7:7, 8:1},
    16: {1:0, 2:14, 3:10, 4:6, 5:4, 6:8, 7:12, 8:2, 9:3, 10:13, 11:9, 12:5, 13:7, 14:11, 15:15, 16:1},
    32: {1:0, 2:30, 3:16, 4:14, 5:8, 6:22, 7:24, 8:6, 9:4, 10:26, 11:20, 12:10, 13:12, 14:18,
      15:28, 16:2, 17:3, 18:29, 19:19, 20:13, 21:11, 22:21, 23:27, 24:5, 25:7, 26:25, 27:23, 28:9, 29:15, 30:17, 31:31, 32:1}
  }

  getRanges(side:number, round:number) {
    // TODO: Figure out a more elegant way to do this
    if (side === 0) {
      switch (round) {
        case 0:
          return [0,2,4,6,8,10,12,14];
        case 1:
          return [0,2,4,6];
        case 2:
          return [0,2];
        case 3:
          return [0];
      }
    } else {
      switch (round) {
        case 0:
          return [16,18,20,22,24,26,28,30];
        case 1:
          return [8,10,12,14];
        case 2:
          return [4,6];
        case 3:
          return [2];
      }
    }
  }

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

  winTournament(anime: Anime) {
    // Make sure we have 2 finalists
    // TODO: The round number is hardcoded right now, make it dynamic
    if (this.finalistList[4][0].name === "empty" || this.finalistList[4][1].name === "empty") {
      return;
    }
    this.animeService.setSingleFinalist(anime).subscribe((res) => {
      if (res.success) {
        this.winner = anime.name;
        localStorage.setItem("area11-bracket", "");
        localStorage.setItem("seed-count", "");
        this.displayToast("Congratulations to the winner!");
        if (this.enableFireworks) {
          this.fireworks = true;
          setTimeout(() => {
            this.fireworks = false;
          }, 6000);
        }
      } else {
        this.displayToast("Sorry, there was a problem.", true);
        console.log(res);
      }
    });
  }

  getSeed(comments: string[]) {
    // If seeded according to seed formatting, display seed number
    if (!comments) return;
    for (let comment of comments) {
      comment = comment.trim().toLowerCase();
      if (comment[0] === "#" && comment.length >= 2 && comment.slice(2) === " seed" && !isNaN(parseInt(comment[1]))) {
        return comment[1];
      }
    }
    return "";
  }

  moveToNextRound(animeIndex:number, roundIndex:number) {
    // Can only move if there is a choice between 2
    if (this.finalistList[roundIndex-1][animeIndex].name === "bye") {
      return;
    }
    if (animeIndex % 2 === 0 && (this.finalistList[roundIndex-1][animeIndex].name === "empty" || this.finalistList[roundIndex-1][animeIndex+1].name === "empty")) {
      return;
    } else if (animeIndex % 2 === 1 && (this.finalistList[roundIndex-1][animeIndex].name === "empty" || this.finalistList[roundIndex-1][animeIndex-1].name === "empty")) {
      return
    }
    this.finalistList[roundIndex][Math.floor(animeIndex / 2)] = this.finalistList[roundIndex-1][animeIndex];
    this.validateBracket();
  }

  private validateBracket() {
    // Process things like byes and reprocess things that are inconsistent due to "undos"
    let changes = true;
    while (changes) {
      changes = false;
      for (let i=0; i<this.finalistList.length - 1; i++) {
        for (let j=0; j<this.finalistList[i].length; j++) {
          if (j % 2 == 1) {
            // j is odd -- do bye comparison
            let finalist = this.finalistList[i][j];
            let finalist2 = this.finalistList[i][j-1];
            if (finalist.name === "bye" && finalist2.name !== "bye" && this.finalistList[i+1][(j-1)/2].name === "empty") {
              // move up
              this.finalistList[i+1][(j-1) / 2] = finalist2;
              changes = true;
            } else if (finalist.name !== "bye" && finalist2.name === "bye" && this.finalistList[i+1][(j-1)/2].name === "empty") {
              // move up
              this.finalistList[i+1][(j-1) / 2] = finalist;
              changes = true;
            }
          }
        }
      }
    }
    // Now do back validation
    for (let i=1; i<this.finalistList.length; i++) {
      for (let j=0; j<this.finalistList[i].length; j++) { 
        let current = this.finalistList[i][j].name;
        if (current !== this.finalistList[i-1][j*2].name && current !== this.finalistList[i-1][j*2 + 1].name) {
          this.finalistList[i][j] = new Anime("empty", "empty");
          changes = true;
        }
      }
    }
    // Save to local storage
    localStorage.setItem("area11-bracket", JSON.stringify(this.finalistList));
    localStorage.setItem("seed-count", JSON.stringify(this.seedCount));
  }

  private placeAsSeed(currentIDX: number, seed: number) {
    let seedIDX = this.SEEDMAP[32][seed];
    let tmp = this.finalistList[0][seedIDX];
    this.finalistList[0][seedIDX] = this.finalistList[0][currentIDX];
    this.finalistList[0][currentIDX] = tmp;
  }

  private determineFinalistPositions() {
    // Shuffle finalists to their designated spots w/main factors being seeds & byes
    // Shuffle to start
    this.finalistList[0] = shuffle(this.finalistList[0]);
    // Start with putting seeds in their places
    let seedFound = true;
    let currentSeed = 0;
    while (seedFound) {
      seedFound = false;
      for (let i=0; i<this.finalistList[0].length; i++) {
        if (parseInt(this.getSeed(this.finalistList[0][i].comments)) == (currentSeed + 1)) {
          seedFound = true;
          currentSeed++;
          this.finalistList[0][i]["hasBeenSeeded"] = currentSeed;
          this.placeAsSeed(i, currentSeed);
        } else if (parseInt(this.getSeed(this.finalistList[0][i].comments)) < (currentSeed + 1) && !this.finalistList[0][i]["hasBeenSeeded"]) {
          // Duplicate seeds
          this.validFinalists = false;
          return;
        }
      }
    }
    this.seedCount = currentSeed;
    // Place remaining unseeded anime in pretend seeded order
    let finalSeedCount = currentSeed;
    seedFound = true;
    while (seedFound) {
      seedFound = false;
      for (let i=0; i<this.finalistList[0].length; i++) {
        if (!this.finalistList[0][i]["hasBeenSeeded"] && this.finalistList[0][i].name !== "bye") {
          seedFound = true;
          finalSeedCount++;
          this.finalistList[0][i]["hasBeenSeeded"] = finalSeedCount;
          this.placeAsSeed(i, finalSeedCount);
        }
      }
    }
    // Now place byes one at a time until we run out of space
    let byePositions = [];
    for (let i=0; i<this.finalistList[0].length; i++) {
      if (this.finalistList[0][i].name === "bye") {
        byePositions.push(i);
      }
    }
    for(let i=0; i<byePositions.length; i++) {
      this.placeAsSeed(byePositions[i], 32-i);
    }
  }

  generateSubsequentRounds() {
    // Fill out the rest of finalistList
    let nextRoundSize = this.finalistList[0].length / 2;
    while (nextRoundSize > 1) {
      this.finalistList.push([]);
      for (let i=0; i<nextRoundSize; i++) {
        this.finalistList[this.finalistList.length - 1].push(new Anime("empty", "empty"));
      }
      nextRoundSize = nextRoundSize / 2;
    }
  }

  private confirmSavedDataIsAccurate(savedData) {
    let savedList = JSON.parse(savedData);
    // Make sure seeds + number of finalists is the same across both lists
    if (this.finalistList[0].length !== savedList[0].length) {
      return false;
    }
    for(let anime of this.finalistList[0]) {
      let found = false;
      for (let otherAnime of savedList[0]) {
        if (anime.name === otherAnime.name && this.getSeed(anime.comments) === this.getSeed(otherAnime.comments)) {
          found = true;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private animeService: AnimeService
  ) { }

  refresh() {
    // Get finalist list
    this.animeService.fetchAnime(this.currentUser).subscribe((res) => {
      if (res.success) {
        for (let anime of res.animeList) {
          if (anime.isFinalist) {
            this.finalistList[0].push(anime);
          }
        }
        // TODO: first condition should eventually be < 8, not < 17
        if (this.finalistList[0].length < 17 || this.finalistList[0].length > 32) {
          this.validFinalists = false;
          this.isLoading = false;
          return;
        }
        while (this.finalistList[0].length < 32) {
          this.finalistList[0].push(new Anime("bye", "bye"));   // dummy anime
        }
        // If we have it in local storage, then no need to get it from server
        let savedData = localStorage.getItem("area11-bracket");
        let seedCount = localStorage.getItem("seed-count");
        if (savedData && seedCount && this.confirmSavedDataIsAccurate(savedData)) {
          this.finalistList = JSON.parse(savedData);
          this.seedCount = parseInt(seedCount);
          this.isLoading = false;
          return;
        }
        this.determineFinalistPositions();
        if (this.validFinalists) {
          this.generateSubsequentRounds();
          this.validateBracket();
        }
        this.isLoading = false;
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
      }
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.refreshHeader = Math.random();

    this.finalistList = [[]];
    this.validFinalists = true;

    this.winner = "";
    this.fireworks = false;
    this.enableFireworks = false;

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            this.currentUser = res.user.username;

            this.userService.getUserInfo().subscribe((res) => {
              if (res["success"]) {
                if (res.user.fireworks) {
                  this.enableFireworks = res["user"]["fireworks"];
                }
                this.refresh();
              }
            });
          } else {
            this.displayToast("There was a problem loading your information.", true)
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
