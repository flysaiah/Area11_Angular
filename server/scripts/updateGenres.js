const config = require('../config/database.js')
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect(config.uri, {useMongoClient: true}, (err) => {
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
let genreList = [];

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
            // HACK: This is pretty ugly but I'm not sure how else to do it right now
            try {
              let tmpArr = [];
              const foo = stuff.split("Genres:")[1].split("</div>")[0].replace(/["]+/g, '').split("title=");
              for (let i=1; i<foo.length; i++) {
                let tmp = foo[i]
                tmpArr.push(tmp.split("<a")[0].split(">")[0])
              }
              genreList.push({name: someAnime.name, malID: someAnime.id, genres: tmpArr});

            } catch (err) {
              console.log("---------------ERRORHAI---------------");
              console.log(someAnime);
              console.log(err);
              console.log("---------------ERRORBYE---------------")
            }
          }).close();
        }
        if (arr.length == 1) {
          // Done populating genreList
          // Give enough time for final iteration to finish
          setTimeout(() => {
            console.log("Happening");
            async.eachSeries(genreList, function updateAnime (genreObj, done) {
              Anime.update({ malID: genreObj.malID }, { $set: {
                genres: genreObj.genres,
              } }, {multi: true}, done);
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
