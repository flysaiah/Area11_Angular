import { Component, OnInit, Inject } from '@angular/core';
import { Anime } from '../anime';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { AnimeService } from '../services/anime.service';
import { AuthService } from '../services/auth.service';
import { TimelineService } from '../services/timeline.service';
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
  // We keep 2 copies of everything so that when we filter by genre we don't have to re-fetch data
  newWantToWatch: Anime[];
  newConsidering: Anime[];
  newCompleted: Anime[];
  finalistList: Anime[];
  showAddAnimePrompt: boolean;   // If true, "Add anime" prompt is visible
  linkAnimeSuggestions: Anime[];
  animeToAdd: Anime;   // This is the anime the user is in the process of adding, if any
  selectedAnime: Anime;   // Currently selected anime that we show details for
  canSelectAsFinalist: boolean;
  showFinalistStats: boolean;
  finalistGenreDict: Map<string, number>;
  possibleCategories: string[];
  // We do simple toasts without outside packages
  showToast: boolean;
  toastMessage: string;
  toastError: boolean;
  sortCriteria: string;
  showCategory: string;
  currentUser: string;
  autoTimelineAdd: boolean;   // If true, then automatically add completed anime to timeline

  allGenres: string[];
  selectedGenre: string;

  allTypes: string[];
  selectedType: string;

  refreshHeader: number;
  isLoading: boolean;
  catalogIsLoading: boolean;   // for when we just need the animation on left panel
  scrollTop: number;

  searchAnimeCtl: FormControl;
  searchAnime: Anime[];
  searchText: string;
  filteredSearchAnime: Observable<any[]>;

  hideFinalistsPanel: boolean;
  enableFireworks: boolean;
  fireworks: boolean;   // If true, then fireworks animation plays

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
  showAnimeDetails(anime: Anime, clearSearchBar?: boolean) {
    this.selectedAnime = anime;
    // Some elements like [i] and [/i] are used in description, so we replace with regex to ensure they render correctly
    if (this.selectedAnime["description"]) {
      this.selectedAnime["description"] = this.selectedAnime["description"].replace(/\[i\]/g, "\<i\>").replace(/\[\/i\]/g, "\</i\>")
    }
    this.validateSelectAsFinalistButton();
    if (clearSearchBar) {
      this.searchText = "";
    }
  }

  private sortByField(fieldName, direction) {
    // Returns comparator to sort an array of object by fieldName
    // Direction specifies ascending vs descending
    // Special case for date

    if (direction == "ascending") {
      return function (a,b) {
        let tmpA = a[fieldName];
        let tmpB = b[fieldName];
        if (fieldName == "startDate") {
          if (!tmpA) {
            tmpA = new Date("01/01/2099");
          } else {
            tmpA = new Date(tmpA);
          }
          if (!tmpB) {
            tmpB = new Date("01/01/2099");
          } else {
            tmpB = new Date(tmpB);
          }
        }
        return (tmpA < tmpB) ? -1 : (tmpA > tmpB) ? 1 : 0;
      }
    } else {
      return function (a,b) {
        let tmpA = a[fieldName];
        let tmpB = b[fieldName];
        if (fieldName == "startDate") {
          if (!tmpA) {
            tmpA = new Date("01/01/2099");
          } else {
            tmpA = new Date(tmpA);
          }
          if (!tmpB) {
            tmpB = new Date("01/01/2099");
          } else {
            tmpB = new Date(tmpB);
          }
        }
        return (tmpA > tmpB) ? -1 : (tmpA < tmpB) ? 1 : 0;
      }
    }
  }

  hideFinalists() {
    this.hideFinalistsPanel = true;
  }

  showFinalists() {
    this.hideFinalistsPanel = false;
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
        } else if (res["message"] == "Token") {
          this.displayToast("Your session has expired. Please refresh and log back in.", true);
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
        // Open dialog
        let dialogRef = this.dialog.open(LinkAnimeDialog, {
          width: '515px',
          data: {suggestions: this.linkAnimeSuggestions}
        });

        dialogRef.afterClosed().subscribe((result) => {
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

  private randomSort(animeArr) {
    // Uses Fisher-Yates algorithm to randomly sort array
    let a = JSON.parse(JSON.stringify(animeArr));
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
  }

  sortAnime(criteria) {
    // Sort all anime lists by the criteria picked in the toolbar select
    const c1 = criteria.split(",")[0];
    const c2 = criteria.split(",")[1];
    if (c1 == "random") {
      this.wantToWatchList = this.randomSort(this.wantToWatchList);
      this.consideringList = this.randomSort(this.consideringList);
      this.completedList = this.randomSort(this.completedList);
    } else {
      this.wantToWatchList.sort(this.sortByField(c1, c2));
      this.consideringList.sort(this.sortByField(c1, c2));
      this.completedList.sort(this.sortByField(c1, c2));
    }
    this.wantToWatchList.sort(this.sortByField(c1, c2));
    this.consideringList.sort(this.sortByField(c1, c2));
    this.completedList.sort(this.sortByField(c1, c2));
  }

  private genreFilter(anime) {
    for (let genre of anime["genres"]) {
      if (genre == this.selectedGenre) {
        return true;
      }
    }
    return false;
  }

  private typeFilter(anime) {
    return (this.selectedType == anime["type"])
  }

  filterAnimeByGenre(criteria) {
    if (criteria == "All Genres") {
      this.wantToWatchList = JSON.parse(JSON.stringify(this.newWantToWatch));
      this.consideringList = JSON.parse(JSON.stringify(this.newConsidering));
      this.completedList = JSON.parse(JSON.stringify(this.newCompleted));
    } else {
      this.wantToWatchList = this.newWantToWatch.filter(this.genreFilter.bind(this));
      this.consideringList = this.newConsidering.filter(this.genreFilter.bind(this));
      this.completedList = this.newCompleted.filter(this.genreFilter.bind(this));
    }
    // Need to sort afterwards in case we applied criteria that didn't affect anime not shown / shown in this filter
    this.sortAnime(this.sortCriteria);

  }

  filterAnimeByType(criteria) {
    if (criteria == "All Types") {
      this.wantToWatchList = JSON.parse(JSON.stringify(this.newWantToWatch));
      this.consideringList = JSON.parse(JSON.stringify(this.newConsidering));
      this.completedList = JSON.parse(JSON.stringify(this.newCompleted));
    } else {
      this.wantToWatchList = this.newWantToWatch.filter(this.typeFilter.bind(this));
      this.consideringList = this.newConsidering.filter(this.typeFilter.bind(this));
      this.completedList = this.newCompleted.filter(this.typeFilter.bind(this));
    }
    // Need to sort afterwards in case we applied criteria that didn't affect anime not shown / shown in this filter
    this.sortAnime(this.sortCriteria);
  }

  private getGenres() {
    let allGenres = new Set<string>();
    // NOTE: This could be a little costly eventually, so make sure to minimize when we call refresh()
    for (let anime of this.searchAnime) {
      for (let genre of anime["genres"]) {
        if (!allGenres.has(genre)) {
          allGenres.add(genre)
        }
      }
    }
    this.allGenres = Array.from(allGenres);
  }

  private getTypes() {
    let allTypes = new Set<string>();
    for (let anime of this.searchAnime) {
      if (!allTypes.has(anime["type"])) {
        allTypes.add(anime["type"])
      }
    }
    this.allTypes = Array.from(allTypes);
  }

  addAnimeToCatalog(category?: string) {
    // category parameter is for when we're changin categories
    if (category) {
      this.animeToAdd['category'] = category;
    }
    this.animeService.addAnimeToCatalog(this.animeToAdd).subscribe(res => {
      if (res["success"]) {
        this.refresh();
      } else if (res["message"] == "Anime already in catalog") {
          this.displayToast(res["message"], true);
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
  }

  private validateSelectAsFinalistButton() {
    // Custom validation for 'select as finalist' button
    if (this.selectedAnime["category"] != "Completed" || this.selectedAnime["category"] == "Completed" && this.selectedAnime["hasNewSeason"]) {
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
    let selectedAnime = this.selectedAnime;
    let dialogRef = this.dialog.open(FinalistCommentsDialog, {
      width: '300px',
      data: {comments: ""}
    });

    dialogRef.afterClosed().subscribe(result => {
      // Only do something if user hit "Confirm" rather than cancel
      if (typeof result != "undefined") {
      if (result) {
        selectedAnime["comments"] = result.split(";");
        if (selectedAnime["comments"][selectedAnime["comments"].length - 1] == "") {
          selectedAnime["comments"].splice(-1,1);
        }
      }
      this.animeService.selectAsFinalist(selectedAnime["_id"], selectedAnime["comments"]).subscribe((res) => {
        if (!res["success"] && res["message"] == "Token") {
          this.displayToast("Your session has expired. Please refresh and log back in.", true);
        } else if (!res["success"]) {
          this.displayToast("There was a problem.", true);
        }
      });
      this.finalistList.push(selectedAnime);
      this.validateSelectAsFinalistButton();
      // Update finalist stats
      if (selectedAnime["genres"].length && this.finalistGenreDict.size) {
        for (let genre of this.selectedAnime["genres"]) {
          let current = this.finalistGenreDict.get(genre);
          if (typeof current != "undefined") {
            this.finalistGenreDict.set(genre, current + 1);
          } else {
            this.finalistGenreDict;
          }
        }
      }
      this.allGenres.sort(this.sortGenres().bind(this));
      }
    });
  }

  addNewSeason() {
    // Update hasNewSeason flag for anime
    this.animeService.addNewSeason(this.selectedAnime["_id"]).subscribe(res => {
      if (res["success"]) {
        this.selectedAnime.hasNewSeason = true;
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
  }

  removeNewSeason() {
    // Update hasNewSeason flag for anime
    this.animeService.removeNewSeason(this.selectedAnime["_id"]).subscribe(res => {
      if (res["success"]) {
        this.selectedAnime.hasNewSeason = false;
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
  }

  removeAnimeFromCatalog() {
    // remove anime from database
    this.animeService.removeAnimeFromCatalog(this.selectedAnime["_id"]).subscribe(res => {
      if (res["success"]) {
        this.refresh();
        this.selectedAnime = new Anime(this.currentUser, "");
        this.displayToast("Anime successfully removed!");
      } else if (res["message"] == "Already deleted") {
        this.displayToast("This anime has already been removed.", true);
        this.refresh();
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
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
        // If autoTimelineAdd is true, then add to timeline here on move to completed
        if (newCategory == "Completed" && this.autoTimelineAdd) {
          this.timelineService.addAnimeToTimeline(this.selectedAnime["name"], -1).subscribe(res => {
            if (res["success"]) {
            } else if (res["message"] == "Timeline not found") {
              this.displayToast("You haven't started your timeline yet.", true);
            } else {
              this.displayToast("There was a problem.", true);
              console.log(res["message"]);
            }
            this.refresh();
          });
        } else {
          this.refresh();
        }
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res["message"]);
      }
    });
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
        if (!res["success"] && res["message"] == "Token") {
          this.displayToast("Your session has expired. Please refresh and log back in.", true);
        } else if (!res["success"]) {
          console.log(res);
          this.displayToast("There was a problem.", true);
        }
      });
    });
  }

  removeFinalist(index: number) {
    let genres = this.finalistList[index]["genres"] ? JSON.parse(JSON.stringify(this.finalistList[index]["genres"])) : [];
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
            if (this.enableFireworks) {
              this.fireworks = true;
              setTimeout(() => {
                this.fireworks = false;
              }, 6000);
            }
            break;
          } default: {
            // do nothing
          }
        }
        // Update finalist stats
        if (genres.length && this.finalistGenreDict.size) {
          for (let genre of genres) {
            let current = this.finalistGenreDict.get(genre);
            if (current) {
              this.finalistGenreDict.set(genre, current - 1);
            } else {
              console.log("This shouldn't be happening");
            }
          }
        }
        this.allGenres.sort(this.sortGenres().bind(this));
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        console.log(res);
        this.displayToast("There was a problem", true);
      }
    });
  }

  viewFinalist(index: number) {
    this.showAnimeDetails(this.finalistList[index]);
  }

  viewFinalistStats() {
    this.showFinalistStats = true;
    if (!this.finalistGenreDict.size) {
      this.generateFinalistGenreDict();
    }

    // Sort genres so we see the ones with most entries first
  }
  hideFinalistStats() {
    this.showFinalistStats = false;
  }

  private generateFinalistGenreDict() {
    for (let genre of this.allGenres) {
      this.finalistGenreDict.set(genre, 0);
    }
    for (let finalist of this.finalistList) {
      for (let genre of finalist.genres) {
        if (typeof this.finalistGenreDict.get(genre) == undefined) {
          console.log("This shouldn't be happening");
          this.finalistGenreDict.set(genre, 0);
        } else {
          this.finalistGenreDict.set(genre, this.finalistGenreDict.get(genre) + 1);
        }
      }
    }
    this.allGenres.sort(this.sortGenres().bind(this));
  }

  shuffleFinalists() {
    // Randomize order of finalist list
    this.finalistList = this.randomSort(this.finalistList);
  }

  private sortGenres() {
    return function (a:string,b:string) {
      return (this.finalistGenreDict.get(a) < this.finalistGenreDict.get(b)) ? 1 : (this.finalistGenreDict.get(a) > this.finalistGenreDict.get(b) ? -1 : 0)
    }

  }

  filterAnime(name: string) {
    return this.searchAnime.filter(anime =>
      anime.name.toLowerCase().indexOf(name.toLowerCase()) === 0);
  }

  recommendAnime() {
    this.animeService.recommendAnime(this.selectedAnime, this.currentUser).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("Anime recommended!");
        if (!this.selectedAnime["recommenders"]) {
          this.selectedAnime["recommenders"] = [{ name: this.currentUser }];
        } else {
          this.selectedAnime["recommenders"].push({ name: this.currentUser });
        }
        this.selectedAnime["ownerIsRecommender"] = true;
        this.refresh();
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true);
      }
    });
  }
  undoRecommendAnime() {
    this.animeService.undoRecommendAnime(this.selectedAnime, this.currentUser).subscribe((res) => {
      if (res["success"]) {
        this.displayToast("You have taken back your recommendation!");
        if (this.selectedAnime["recommenders"] && this.selectedAnime["recommenders"].length == 1) {
          this.selectedAnime["recommenders"] = [];
        } else if (this.selectedAnime["recommenders"] && this.selectedAnime["recommenders"].length > 1) {
          for (let i=0; i<this.selectedAnime["recommenders"].length; i++) {
            if (this.selectedAnime["recommenders"][i]["name"] == this.currentUser) {
              this.selectedAnime["recommenders"].splice(i,1);
            }
          }
        }
        this.selectedAnime["ownerIsRecommender"] = false;
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true);
        console.log(res);
      }
      this.refresh();
    });
  }

  refresh(fromCategoryChange?: boolean) {
    // Fetch all anime stored in database and update our lists
    if (fromCategoryChange) {
    this.catalogIsLoading = true;
  }
    this.showAddAnimePrompt = false;
    this.animeToAdd = new Anime(this.currentUser, "");

    this.animeService.fetchAnime(this.currentUser).subscribe((res) => {
      if (res["success"]) {
        const animeList = res["animeList"];
        this.newWantToWatch = [];
        this.newConsidering = [];
        this.newCompleted = [];
        const newFinalistList = [];
        const newSearchAnimeList = [];
        for (let anime of animeList) {
          if (anime["category"] == "Want to Watch" && (this.showCategory == "All Categories" || this.showCategory == "Want to Watch")) {
            this.newWantToWatch.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Considering" && (this.showCategory == "All Categories" || this.showCategory == "Considering")) {
            this.newConsidering.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Completed" && (this.showCategory == "All Categories" || this.showCategory == "Completed")) {
            this.newCompleted.push(anime);
            newSearchAnimeList.push(anime);
          }
          if (anime["isFinalist"]) {
            newFinalistList.push(anime);
          }
        }
        this.wantToWatchList = JSON.parse(JSON.stringify(this.newWantToWatch));
        this.consideringList = JSON.parse(JSON.stringify(this.newConsidering));
        this.completedList = JSON.parse(JSON.stringify(this.newCompleted));
        this.finalistList = newFinalistList;
        this.searchAnime = newSearchAnimeList;
        this.getGenres();
        this.getTypes();
        // If we have finalists, make sure we disable the "Add as Finalist" button for those
        if (this.finalistList.length) {
          this.validateSelectAsFinalistButton();
        }
        this.filterAnimeByGenre(this.selectedGenre);
        this.filterAnimeByType(this.selectedType);
        this.sortAnime(this.sortCriteria);
        this.isLoading = false;
        this.catalogIsLoading = false;
        if (fromCategoryChange) {
          // Scroll to top of catalog; this happens when category is changed
          this.scrollTop = Math.random();

        }
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
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
    private timelineService: TimelineService,
    private userService: UserService
  ) { }

  ngOnInit() {
    // Use refreshHeader to force header to refresh
    this.refreshHeader = Math.random();
    this.isLoading = true;
    this.catalogIsLoading = false;
    this.scrollTop = 0;

    this.autoTimelineAdd = false;

    this.wantToWatchList = [];
    this.consideringList = [];
    this.completedList = [];
    this.finalistList = [];

    this.showFinalistStats = false;
    this.finalistGenreDict = new Map<string, number>();

    this.searchAnimeCtl = new FormControl();
    this.searchText = "";
    this.filteredSearchAnime = this.searchAnimeCtl.valueChanges
      .startWith(null)
      .map(anime => anime ? this.filterAnime(anime) : this.searchAnime.slice());
    this.searchAnime = [];

    this.selectedGenre = "All Genres";
    this.allGenres = [];

    this.selectedType = "All Types";
    this.allTypes = []

    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    this.animeToAdd = new Anime("", "");
    this.selectedAnime = new Anime("", "");
    this.sortCriteria = "_id,ascending"
    this.showCategory = "All Categories";
    this.possibleCategories = ["Want to Watch", "Considering", "Completed"];
    this.showToast = false;
    this.toastMessage = "";

    this.hideFinalistsPanel = false;
    this.fireworks = false;
    this.enableFireworks = false;

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.animeToAdd["user"] = this.currentUser;
        this.selectedAnime["user"] = this.currentUser;

        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            if (res["user"]["autoTimelineAdd"]) {
              this.autoTimelineAdd = res["user"]["autoTimelineAdd"];
            }
            if (res["user"]["fireworks"]) {
              this.enableFireworks = res["user"]["fireworks"];
            }
            this.refresh();
          } else {
            this.displayToast("There was a problem loading your settings.", true)
          }
        });
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
