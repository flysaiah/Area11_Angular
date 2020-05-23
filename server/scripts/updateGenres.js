const config = require('../config/database.js')
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect(config.uri, (err) => {
  if (err) {
    console.log('Could not connect to database: ', err);
  } else {
    console.log('Connected to database: ' + config.db);
  }
});
const Anime = require('../models/anime.js');
const Horseman = require('node-horseman');
var async = require("async");
let malIDs = new Set();
let allAnime = [];
let updateList = [];

Anime.find({}, (err, animeList) => {
  if (err) {
    mongoose.disconnect();
    console.log(err);
  } else {

    for (let anime of animeList) {
      if (!malIDs.has(anime.malID)) {
        allAnime.push({id: anime.malID, name: anime.name, mongoID: anime._id});
        malIDs.add(anime.malID);
      }
    }
    let getGenres = function (arr) {
      setTimeout(() => {
        if (arr.length == 0) {
          return;
        }
        let someAnime = arr[0];
        console.log("Current: " + someAnime.name);
        if (someAnime.id) {
          const horseman = new Horseman({
            timeout: 5000,
            loadImages: false,
            injectJquery: false,
          });
          horseman.open("http://myanimelist.net/anime/" + someAnime.id).html().then((stuff) => {
            try {
              // Re-update name
              const name = stuff.split('<span class="h1-title"><span itemprop="name">')[1].split('<')[0].trim();
              console.log("---NAME---");
              console.log(name);
              // Description
              const description = stuff.split('<span itemprop="description">')[1].split("</span>")[0];
              console.log("---DESC---");
              console.log(description)
              // Rating
              let rating;
              let r = stuff.split('<span itemprop="ratingValue"');
              if (r.length > 1) {
                rating = r[1].split(">")[1].split("<")[0].trim();
              }
              console.log("---RATING---");
              console.log(rating);
              // Thumbnail
              const thumbnail = stuff.split('<meta property="og:image" content="')[1].split('">')[0].trim();
              console.log("---THUMBNAIL---")
              console.log(thumbnail);
              // Genres
              let genreArr = [];
              const foo = stuff.split("Genres:")[1].split("</div>")[0].replace(/["]+/g, '').split("title=");
              for (let i=1; i<foo.length; i++) {
                let tmp = foo[i];
                genreArr.push(tmp.split("<a")[0].split(">")[0]);
              }
              console.log("---GENRES---");
              console.log(genreArr);
              // Start Date
              let runtime = "";
              const airing = stuff.split('<span class="dark_text">Aired:</span>')[1].split('</div>')[0].trim();
              let startDate = "Unknown";
              let endDate = "Unknown";
              if (airing.split(" to ").length > 1) {
                let start = new Date(airing.split(" to ")[0]);
                let end = new Date(airing.split(" to ")[1]);
                if (start.toLocaleDateString() == "Invalid Date") {
                  startDate = airing.split(" to ")[0];
                } else {
                  startDate = start.toLocaleDateString();
                }
                if (end.toLocaleDateString() == "Invalid Date") {
                  endDate = airing.split(" to ")[1];
                } else {
                  endDate = end.toLocaleDateString();
                }
              } else {
                let start = new Date(airing);
                if (start.toLocaleDateString() == "Invalid Date") {
                  startDate = airing;
                } else {
                  startDate = start.toLocaleDateString();
                }
                endDate = "OneAiredDate";
                runtime = stuff.split('<span class="dark_text">Duration:</span>')[1].split('</div>')[0].trim();
              }
              console.log("---STARTDATE---");
              console.log(startDate);
              // End Date
              console.log("---ENDDATE---");
              console.log(endDate);
              // Type
              const type = stuff.split('<span class="dark_text">Type:</span>')[1].split('</a></div>')[0].split(">")[1].trim();
              console.log("---TYPE---");
              console.log(type);
              // English Title
              let englishTitle = "Unknown";
              let et = stuff.split('English:</span>');
              if (et.length > 1) {
                englishTitle = et[1].split('</div>')[0].trim();
              }
              console.log("---ENGLISH_TITLE---");
              console.log(englishTitle);
              // Status
              const status = stuff.split('<span class="dark_text">Status:</span>')[1].split('</div>')[0].trim();
              console.log("---STATUS---");
              console.log(status);

              let studios = "";
              const studioBlock = stuff.split('<span class="dark_text">Studios:</span>')[1].split('</div>')[0].split('</a>');
              for (let i=0; i<studioBlock.length - 1; i++) {
                const studio = studioBlock[i].split('</a>')[0].split('>')[1].trim();
                if (!studios) {
                  studios = studio;
                } else {
                  studios += ", " + studio;
                }
              }
              console.log("---STUDIOS---");
              console.log(studios);

              // Ranking
              let ranking = stuff.split('<span class="dark_text">Ranked:</span>')[1].split('<sup>')[0].trim().replace("#", "");
              if (isNaN(ranking)) {
                ranking = null;
              }

              console.log("---RANKING---");
              console.log(ranking);

              // Popularity
              let popularity = stuff.split('<span class="dark_text">Popularity:</span>')[1].split('</div>')[0].trim().replace("#", "");
              if (isNaN(popularity)) {
                popularity = null;
              }

              console.log("---POPULARITY---");
              console.log(popularity)

              updateList.push({ name: name, malID: someAnime.id, genres: genreArr, description: description, rating: rating, thumbnail: thumbnail, startDate: startDate, endDate: endDate, type: type, englishTitle: englishTitle, status: status, runtime: runtime, studios: studios, ranking: ranking, popularity: popularity });

            } catch (err) {
              console.log("---------------ERRORHAI---------------");
              console.log(someAnime);
              console.log(err);
              console.log("---------------ERRORBYE---------------");
            }
          }).close();
        }
        if (arr.length == 1) {
          // Done populating updateList
          // Give enough time for final iteration to finish
          setTimeout(() => {
            console.log("Happening");
            async.eachSeries(updateList, function updateAnime (updateObj, done) {
              // console.log("---UDATE_OBJ---");
              // console.log(updateObj)
              Anime.update({ malID: updateObj.malID }, { $set: updateObj }, {multi: true}, done);
            }, function allDone (err) {
              if (err) {
                console.log(err);
              } else {
                console.log("DONE");
                mongoose.disconnect();
              }
            });
          }, 8000)
        } else {
          arr.splice(0,1);
          getGenres(arr)
        }
      }, 8000)
    }
    getGenres(allAnime);

  }
})
