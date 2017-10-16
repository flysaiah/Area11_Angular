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
    for (let anime of animeList) {
      if (!anime.malID) {
        continue;
      }
      var async = require("async");
      const query = encodeURIComponent(anime["name"]);
      console.log(query);
      request.get({url: 'https://area11-burn:yuibestgirl4ever@myanimelist.net/api/anime/search.xml?q=' + query}, function (err, response, body) {
        if (!err) {
          let malList = JSON.parse(parser.toJson(body).toString())["anime"]["entry"];
          async.eachSeries(malList, function updateAnime (malAnime, done) {
            let newAnime = new Anime({
              user: anime['user'],
              name: anime['name'],
              description: anime['description'],
              rating: anime['rating'],
              thumbnail: anime['thumbnail'],
              malID: anime['malID'],
              category: anime['category'],
              isFinalist: anime['isFinalist'],
              genres: anime['genres'],
              startDate: anime['startDate'],
              endDate: anime['endDate'],
              type: anime['type'],
              englishTitle: anime['englishTitle'],
              status: anime['status']
            });
            Anime.update({ malID: malAnime.id }, { $set: {
              description: (typeof malAnime["synopsis"] == "string" ? malAnime["synopsis"] : "").toString(),
              rating: (typeof malAnime["score"] == "string" ? malAnime["score"] : "").toString(),
              thumbnail: (typeof malAnime["image"] == "string" ? malAnime["image"] : "").toString(),
              startDate: (new Date(malAnime["start_date"])).toLocaleDateString(),
              endDate: (new Date(malAnime["end_date"])).toLocaleDateString(),
              type: (typeof malAnime["type"] == "string" ? malAnime["type"] : "").toString(),
              englishTitle: (typeof malAnime["english"] == "string" ? malAnime["english"] : "").toString(),
              status: (typeof malAnime["status"] == "string" ? malAnime["status"] : "").toString()
            } }, done);
          }, function allDone (err) {
            if (err) {
              console.log(err);
            } else {
              mongoose.disconnect();
            }
          });
        } else {
          console.log(err);
          return;
        }
      });
    }
  }
});
