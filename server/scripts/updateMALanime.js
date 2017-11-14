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
const request = require('request');
const Anime = require('../models/anime.js');
const parser = require('xml2json');
Anime.find({}, (err, animeList) => {
  if (err) {
    mongoose.disconnect();
    return err;
  } else {
    let animeSet = new Set();
    let updateMALAnime = function(arr) {
      if (!arr.length) {
        console.log("Done")
        setTimeout(() => {
          mongoose.disconnect();
          return;
        }, 10000)
      } else {
        let anime = arr[0];
        if (animeSet.has(anime["name"])) {
          arr.splice(0,1);
          updateMALAnime(arr);
        } else {
          animeSet.add(anime["name"]);
          console.log("Current: " + anime["name"])
          if (!anime.malID) {
            arr.splice(0,1);
            updateMALAnime(arr);
          }
          setTimeout(() => {
            const query = encodeURIComponent(anime["name"]);
            request.get({url: 'https://area11-burn:yuibestgirl4ever@myanimelist.net/api/anime/search.xml?q=' + query}, function (err, response, body) {
              if (!err) {
                let entries = JSON.parse(parser.toJson(body).toString())["anime"]["entry"];
                let malAnime;
                if (!entries.length && !entries["title"]) {
                  console.log(entries);
                  arr.splice(0,1);
                  updateMALAnime(arr);
                  return;
                } else if (!entries.length) {
                  malAnime = entries;
                } else {
                  for (let entry of entries) {
                    if (entry["title"] == anime["name"]) {
                      malAnime = entry;
                      break;
                    }
                  }
                }
                if (malAnime && malAnime["title"]) {
                  Anime.update({ malID: malAnime.id }, { $set: {
                    description: (typeof malAnime["synopsis"] == "string" ? malAnime["synopsis"] : "").toString(),
                    rating: (typeof malAnime["score"] == "string" ? malAnime["score"] : "").toString(),
                    thumbnail: (typeof malAnime["image"] == "string" ? malAnime["image"] : "").toString(),
                    startDate: (new Date(malAnime["start_date"])).toLocaleDateString(),
                    endDate: (new Date(malAnime["end_date"])).toLocaleDateString(),
                    type: (typeof malAnime["type"] == "string" ? malAnime["type"] : "").toString(),
                    englishTitle: (typeof malAnime["english"] == "string" ? malAnime["english"] : "").toString(),
                    status: (typeof malAnime["status"] == "string" ? malAnime["status"] : "").toString()
                  } }, { multi: true }, (err) => {
                    if (err) {
                      console.log(err);
                    } else {
                      arr.splice(0,1);
                      updateMALAnime(arr);
                    }
                  });
                } else {
                  console.log("----- LAME ISSUE -----");
                  console.log(anime["name"]);
                  console.log(malAnime);
                  console.log("----- ENDOFISSUE -----");
                  arr.splice(0,1);
                  updateMALAnime(arr);
                }
              } else {
                console.log(err);
                mongoose.disconnect();
                return;
              }
            });
          }, 3000);
        }
      }
    }
    updateMALAnime(animeList);
  }
});
