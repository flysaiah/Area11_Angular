import { Component, OnInit, Inject, AfterViewChecked, HostListener } from '@angular/core';
import { Anime } from '../anime';
import { Group } from '../group/group';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { AnimeService } from '../services/anime.service';
import { AuthService } from '../services/auth.service';
import { TimelineService } from '../services/timeline.service';
import { UserService } from '../services/user.service';
import { GroupService } from '../services/group.service';

import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/map';

@Component({
  selector: 'home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  inputs: ['selectedAnime']
})
export class HomeComponent implements AfterViewChecked {
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
  // animeToAdd: Anime;   // This is the anime the user is in the process of adding, if any
  newAnimeMALURL: string;   // This replaces animeToAdd due to MAL API being down
  newAnimeCategory: string;   // This replaces animeToAdd due to MAL API being down
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
  sortScheme: Map<string, string>;
  showCategory: string;
  currentUser: string;
  autoTimelineAdd: boolean;   // If true, then automatically add completed anime to timeline

  allGenres: string[];
  selectedGenre: string;

  allTypes: string[];
  selectedType: string;

  allStudios: string[];
  selectedStudio: string;

  recommendationPreference: string;

  refreshHeader: number;
  isLoading: boolean;
  catalogIsLoading: boolean;   // for when we just need the animation on left panel
  currentlyAddingAnime: boolean;
  scrollTop: number;

  searchAnimeCtl: FormControl;
  searchAnime: Anime[];
  searchText: string;
  filteredSearchAnime: Observable<any[]>;

  currentGroup: Group;
  groupFilterTypes: string[];   // Used to filter by what anime other group members have completed
  groupFilterAnime: string[][];
  groupFilterIndex: number;

  hideFinalistsPanel: boolean;
  hideCatalogPanel: boolean;
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

  ngAfterViewChecked() {
    // Dynamically set height of description depending on button container height
    // We have to do this because we use absolute positioning for button container
    // Not really the Angular way but much simpler than using Observables / etc
    this.adjustDescriptionPanelHeights();
  }

  adjustDescriptionPanelHeights() {
    let dbc = document.getElementById("details-button-container");
    let dpc = document.getElementById("details-panel-content");
    if (dbc && dpc) {
      let newHeight = JSON.stringify(656 - dbc.offsetHeight) + "px";
      if (dpc.style.height != newHeight) {
        dpc.style.height = newHeight;
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeypress(event: KeyboardEvent) {
    // Key up => move through catalog forwards
    // Key down => move through catalog backwards
    // Key right => move through finalists forwards
    // Key left => move through finalists backwards
    if (!this.selectedAnime.name) {
      return;
    }
    let modifier = 1;
    let list;
    switch (event.key) {
      case "ArrowUp":
        modifier = -1;
      case "ArrowDown":
        if (this.wantToWatchList.indexOf(this.selectedAnime) !== -1) {
          list = this.wantToWatchList;
        } else if (this.consideringList.indexOf(this.selectedAnime) !== -1) {
          list = this.consideringList;
        } else if (this.completedList.indexOf(this.selectedAnime) !== -1) {
          list = this.completedList;
        } else {
          // This should never happen
          console.log("KeypressHandler error -- Selected anime not found in catalog!");
          return;
        }
        break;
      case "ArrowLeft":
        modifier = -1;
      case "ArrowRight":
        list = this.finalistList;
        break;
      default:
        // do nothing
        return;
    }
    let currentIndex = list.indexOf(this.selectedAnime);
    if (currentIndex !== -1) {
      let newIndex = (currentIndex + 1 * modifier) % list.length;
      if (newIndex < 0) {
        newIndex = list.length - 1;
      }
      this.selectedAnime = list[newIndex];
      if (list === this.wantToWatchList) {
        this.scrollTop = newIndex * 40;
      } else if (list === this.consideringList) {
        this.scrollTop = this.wantToWatchList.length * 40 + newIndex * 40;
      } else if (list === this.completedList) {
        this.scrollTop = this.wantToWatchList.length * 40 + this.consideringList.length * 40 + newIndex * 40;
      }
    }
    this.validateSelectAsFinalistButton();
  }

  openAddAnimePrompt() {
    this.showAddAnimePrompt = true;
  }
  closeAddAnimePrompt() {
    this.showAddAnimePrompt = false;
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
    // HACK: Not sure why we have to do this, but description panel height isn't correct unless we do
    setTimeout(() => {
      this.adjustDescriptionPanelHeights();
    }, 1);
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

  hideCatalog() {
    this.hideCatalogPanel = true;
  }

  showCatalog() {
    this.hideCatalogPanel = false;
  }

  watchOPs() {
    // Open youtube searches of each finalist in new tabs
    for (let anime of this.finalistList) {
      window.open("http://www.youtube.com/results?search_query=" + encodeURI(anime["name"] + " OP"), "_blank")
    }
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

  private categoryFilter(anime: Anime) {
    return (this.showCategory === anime.category);
  }

  private typeFilter(anime) {
    return (this.selectedType == anime["type"])
  }

  private studioFilter(anime) {
    for (let studio of anime.studios.split(", ")) {
      if (this.selectedStudio === studio.trim()) {
        return true;
      }
    }
    return false;
  }

  private groupFilter(anime: Anime) {
    // Special case is -2 => at least one group member, so check all lists
    if (this.groupFilterIndex === -2) {
      for (let filterList of this.groupFilterAnime) {
        if (filterList.indexOf(anime.name) !== -1) {
          return true;
        }
      }
      return false;
    } else {
      let filterList = this.groupFilterAnime[this.groupFilterIndex];
      return (filterList.indexOf(anime.name) !== -1);
    }
  }

  private recommendationFilter(anime: Anime) {
    return (this.recommendationPreference === "Recommended") ? (anime.recommenders.length > 0) : (anime.recommenders.length === 0);
  }

  applyFilters() {
    this.catalogIsLoading = true;
    let wantToWatch = JSON.parse(JSON.stringify(this.newWantToWatch));
    let considering = JSON.parse(JSON.stringify(this.newConsidering));
    let completed = JSON.parse(JSON.stringify(this.newCompleted));

    if (this.showCategory !== "All Categories") {
      wantToWatch = wantToWatch.filter(this.categoryFilter.bind(this));
      considering = considering.filter(this.categoryFilter.bind(this));
      completed = completed.filter(this.categoryFilter.bind(this));
    }

    if (this.selectedGenre !== "All Genres") {
      wantToWatch = wantToWatch.filter(this.genreFilter.bind(this));
      considering = considering.filter(this.genreFilter.bind(this));
      completed = completed.filter(this.genreFilter.bind(this));
    }

    if (this.selectedType !== "All Types") {
      wantToWatch = wantToWatch.filter(this.typeFilter.bind(this));
      considering = considering.filter(this.typeFilter.bind(this));
      completed = completed.filter(this.typeFilter.bind(this));
    }

    if (this.selectedStudio !== "All Studios") {
      wantToWatch = wantToWatch.filter(this.studioFilter.bind(this));
      considering = considering.filter(this.studioFilter.bind(this));
      completed = completed.filter(this.studioFilter.bind(this));
    }

    if (this.groupFilterTypes.length && this.groupFilterIndex !== -1) {
      wantToWatch = wantToWatch.filter(this.groupFilter.bind(this));
      considering = considering.filter(this.groupFilter.bind(this));
      completed = completed.filter(this.groupFilter.bind(this));
    }

    if (this.recommendationPreference !== "No Filter") {
      wantToWatch = wantToWatch.filter(this.recommendationFilter.bind(this));
      considering = considering.filter(this.recommendationFilter.bind(this));
      completed = completed.filter(this.recommendationFilter.bind(this));
    }

    this.wantToWatchList = wantToWatch;
    this.consideringList = considering;
    this.completedList = completed;

    this.sortAnime(this.sortCriteria);
    this.catalogIsLoading = false;

  }

  private getGenres() {
    let allGenres = new Set<string>();
    // NOTE: This could be a little costly eventually, so make sure to minimize when we call refresh()
    for (let anime of this.searchAnime) {
      for (let genre of anime["genres"]) {
        if (!allGenres.has(genre)) {
          allGenres.add(genre);
        }
      }
    }
    this.allGenres = Array.from(allGenres).sort();
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

  private getStudios() {
    let allStudios = new Set<string>();
    for (let anime of this.searchAnime) {
      if (!allStudios.has(anime["studios"])) {
        for (let studio of anime.studios.split(", ")) {
          allStudios.add(studio);
        }
      }
    }
    this.allStudios = Array.from(allStudios).sort();
  }

  addAnimeToCatalog(category?: string) {
    // category parameter is for when we're changing categories

    this.currentlyAddingAnime = true;

    let cat = this.newAnimeCategory;
    if (category) {
      cat = category;
    }

    this.animeService.addAnimeToCatalog(this.newAnimeMALURL, cat).subscribe(res => {
      if (res["success"]) {
        this.newAnimeCategory = "";
        this.newAnimeMALURL = "";
        this.displayToast("Successfully added anime to catalog!");
        this.refresh();
      } else if (res["message"] == "Anime already in catalog") {
          this.displayToast(res["message"], true);
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
      }
      this.currentlyAddingAnime = false;
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
        // Remove unnecessary spaces
        for (let i=0; i<selectedAnime.comments.length; i++) {
          selectedAnime.comments[i] = selectedAnime.comments[i].trim();
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
        this.validateSelectAsFinalistButton();
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
      }
    });
  }

  removeNewSeason() {
    // Update hasNewSeason flag for anime
    this.animeService.removeNewSeason(this.selectedAnime["_id"]).subscribe(res => {
      if (res["success"]) {
        this.selectedAnime.hasNewSeason = false;
        this.validateSelectAsFinalistButton();
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
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
        console.log(res);
      }
    });
  }

  private updateCategoryChangeUI(anime: Anime, oldCat: string, newCat: string) {
    let idx;
    switch (oldCat) {
      case "Want to Watch":
        idx = this.wantToWatchList.indexOf(anime);
        this.wantToWatchList.splice(idx, 1);
        break;
      case "Considering":
        idx = this.consideringList.indexOf(anime);
        this.consideringList.splice(idx, 1);
        break;
      case "Completed":
        idx = this.completedList.indexOf(anime);
        this.completedList.splice(idx, 1);
        break;
      default:
        console.log("WARNING: THIS SHOULD NOT BE HAPPENING");
    }
    // NOTE: We only add if the categories have a length; otherwise those are probably filtered out
    switch (newCat) {
      case "Want to Watch":
        if (this.wantToWatchList.length) {
          this.wantToWatchList.push(anime);
        }
        break;
      case "Considering":
        if (this.consideringList.length) {
          this.consideringList.push(anime);
        }
        break;
      case "Completed":
        if (this.completedList.length) {
          this.completedList.push(anime);
        }
        break;
      default:
        console.log("WARNING: THIS SHOULD NOT BE HAPPENING");
    }
  }

  changeCategory(newCategory: string) {
    // Update database entry to reflect category change of anime
    let oldCategory = this.selectedAnime["category"];
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
              console.log(res);
            }
            this.updateCategoryChangeUI(this.selectedAnime, oldCategory, newCategory);
          });
        } else {
          this.updateCategoryChangeUI(this.selectedAnime, oldCategory, newCategory);
        }
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
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
      // Remove unnecessary spaces
      for (let i=0; i<this.finalistList[index].comments.length; i++) {
        this.finalistList[index].comments[i] = this.finalistList[index].comments[i].trim();
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
    // Simple fuzzy search
    const case1 = this.searchAnime.filter(anime => {
      if (anime.name.toLowerCase().indexOf(name.toLowerCase()) === 0) {
        return true;
      }
      const titleWords = anime.name.split(" ");
      for (let word of titleWords) {
        if (word.length > 3 && word.toLowerCase().indexOf(name.toLowerCase()) === 0) {
          return true;
        }
      }
      return false;
    });
    const case2 = this.searchAnime.filter(anime => {
      if (!anime.englishTitle || case1.indexOf(anime) !== -1) {
        return false;
      }
      if (anime.englishTitle.toLowerCase().indexOf(name.toLowerCase()) === 0) {
        return true;
      }
      const titleWords = anime.englishTitle.split(" ");
      for (let word of titleWords) {
        if (word.length > 3 && word.toLowerCase().indexOf(name.toLowerCase()) === 0) {
          return true;
        }
      }
      return false;    });
    return case1.concat(case2);
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

  getFormattedDate(date: string) {
    return date ? this.formatDate(date) : "Unknown";
  }

  private formatDate(date: string) {
    const dObj = new Date(date);
    const res = dObj.toLocaleDateString();
    if (res == "Invalid Date") {
      return "Unkown";
    }
    return res;
  }

  nostalgiaButton() {
    // Randomly select anime from completed list to view
    if (!this.completedList.length) {
      this.displayToast("You've filtered out all of your completed anime!", true);
    } else {
      this.selectedAnime = this.completedList[Math.floor(Math.random() * this.completedList.length)]
    }
  }

  filterWatch(type: string, newValue: string, newValueNumber?: number) {
    // Change model and refresh
    // TODO: This doesn't seem very Angular-like, investiage how we could use models instead
    switch(type) {
      case "Category":
        this.showCategory = newValue;
        break;
      case "Type":
        this.selectedType = newValue;
        break;
      case "Studio":
        this.selectedStudio = newValue;
        break;
      case "Genre":
        this.selectedGenre = newValue;
        break;
      case "Sort":
        this.sortCriteria = newValue;
        break;
      case "Group":
        this.groupFilterIndex = newValueNumber;
        break;
      case "Recommendation":
        this.recommendationPreference = newValue;
        break;
      default:
        console.log("This should never happen");
    }
    this.applyFilters();
    this.scrollTop = Math.random();
  }

  private populateGroupFilterLists() {
    // Get list of anime watched by group members for group filters
    let groupFilterTypes = [];
    let groupFilterAnime = [];

    this.groupService.getGroupMemberAnime(this.currentGroup.name).subscribe(res => {
      if (res["success"]) {
        // First populate filter types
        let memberAnimeMap = new Map<string, Anime[]>();
        for (let anime of res["anime"]) {
          if (!memberAnimeMap.has(anime.user)) {
            memberAnimeMap.set(anime.user, [anime.name]);
          } else {
            memberAnimeMap.get(anime.user).push(anime.name);
          }
          if (groupFilterTypes.indexOf(anime.user) === -1) {
            let newFilterTypes = [anime.user];
            for (let i=0; i<groupFilterTypes.length; i++) {
              newFilterTypes.push(groupFilterTypes[i] + " + " + anime.user);
            }
            groupFilterTypes = groupFilterTypes.concat(newFilterTypes);
          }
        }
        // Now generate completed lists for each filter combo
        for (let filterType of groupFilterTypes) {
          let filterList = [];
          let members = filterType.split(" + ");
          for (let anime of res["anime"]) {
            let valid = true;
            for (let member of members) {
              if (memberAnimeMap.get(member).indexOf(anime.name) === -1) {
                valid = false;
              }
            }
            if (valid && filterList.indexOf(anime.name) === -1) {
              filterList.push(anime.name);
            }
          }
          groupFilterAnime.push(filterList);
        }
        this.groupFilterTypes = groupFilterTypes;
        this.groupFilterAnime = groupFilterAnime;
      } else {
        console.log(res);
        this.displayToast("There was a problem getting your group info.", true);
      }
    });
  }

  getSeed(comment: string) {
    // If comment matches format for seeds, return corresponding seed number
    comment = comment.trim().toLowerCase();
    if (comment[0] !== "#" || comment.length <= 2 || comment.slice(2) !== " seed" || isNaN(parseInt(comment[1]))) {
      return -1;
    }
    return parseInt(comment[1]);
  }

  refresh() {
    // Fetch all anime stored in database and update our lists

    this.animeService.fetchAnime(this.currentUser).subscribe((res) => {
      if (res["success"]) {
        const animeList = res["animeList"];
        this.newWantToWatch = [];
        this.newConsidering = [];
        this.newCompleted = [];
        const newFinalistList = [];
        const newSearchAnimeList = [];
        for (let anime of animeList) {
          if (anime["category"] == "Want to Watch") {
            this.newWantToWatch.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Considering") {
            this.newConsidering.push(anime);
            newSearchAnimeList.push(anime);
          } else if (anime["category"] == "Completed") {
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
        this.getStudios();
        // If we have finalists, make sure we disable the "Add as Finalist" button for those
        if (this.finalistList.length) {
          this.validateSelectAsFinalistButton();
        }

        this.applyFilters();
        this.isLoading = false;
      } else if (res["message"] == "Token") {
        this.displayToast("Your session has expired. Please refresh and log back in.", true);
      } else {
        this.displayToast("There was a problem.", true)
        console.log(res);
      }

    });
  }

  constructor(
    private dialog: MatDialog,
    private animeService: AnimeService,
    private authService: AuthService,
    private groupService: GroupService,
    private timelineService: TimelineService,
    private userService: UserService
  ) { }

  ngOnInit() {
    // Use refreshHeader to force header to refresh
    this.refreshHeader = Math.random();
    this.isLoading = true;
    this.currentlyAddingAnime = false;
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
    this.allTypes = [];

    this.selectedStudio = "All Studios";
    this.allStudios = [];

    this.recommendationPreference = "No Filter";

    this.groupFilterTypes = [];
    this.groupFilterAnime = [];
    this.groupFilterIndex = -1;

    this.showAddAnimePrompt = false;
    this.linkAnimeSuggestions = [];
    // this.animeToAdd = new Anime("", "");
    this.newAnimeMALURL = "";
    this.newAnimeCategory = "";
    this.selectedAnime = new Anime("", "");
    this.sortCriteria = "_id,ascending";
    this.sortScheme = new Map<string,string>();
    this.sortScheme.set("_id,ascending", "Default Sorting");
    this.sortScheme.set("name,ascending", "Alphabetical");
    this.sortScheme.set("rating,descending", "Rating (High to Low)");
    this.sortScheme.set("rating,ascending", "Rating (Low to High)");
    this.sortScheme.set("startDate,ascending", "Air Date (Old to New)");
    this.sortScheme.set("startDate,descending", "Air Date (New to Old)");
    this.sortScheme.set("random,_", "Random");

    this.showCategory = "All Categories";
    this.possibleCategories = ["Want to Watch", "Considering", "Completed"];
    this.showToast = false;
    this.toastMessage = "";

    this.hideFinalistsPanel = false;
    this.hideCatalogPanel = false;
    this.fireworks = false;
    this.enableFireworks = false;

    this.authService.getProfile().subscribe((res) => {
      if (res["success"]) {
        this.currentUser = res["user"]["username"];
        this.selectedAnime["user"] = this.currentUser;

        this.userService.getUserInfo().subscribe((res) => {
          if (res["success"]) {
            if (res["user"]["autoTimelineAdd"]) {
              this.autoTimelineAdd = res["user"]["autoTimelineAdd"];
            }
            if (res["user"]["fireworks"]) {
              this.enableFireworks = res["user"]["fireworks"];
            }

            if (res["user"]["group"]) {
              this.groupService.getGroupInfo(res["user"]["group"]).subscribe((res) => {
                if (res["success"]) {
                  this.currentGroup = res["group"];
                  this.populateGroupFilterLists();   // Definitely don't want to do this every refresh
                } else {
                  console.log(res);
                }
                this.refresh();
              });
            } else {
              this.refresh();
            }
          } else {
            this.displayToast("There was a problem loading your settings.", true)
          }
        });
      } else {
        // If there was a problem we need to have them log in again
        this.authService.logout();
        console.log(res);
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
