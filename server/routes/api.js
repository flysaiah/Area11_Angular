const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Anime = require('../models/anime.js');
const User = require('../models/user.js');
const Group = require('../models/group.js');

module.exports = (router) => {


  // Any route that requires authentication goes after this middleware

  router.post('/removeAnimeFromCatalog', (req, res) => {
    Anime.findOne({ '_id': ObjectID(req.body.id)}, (err, anime) => {
      if (err) {
        res.json({ success: false, message: err })
      } else {
        anime.remove((err) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.json({ success: true, message: 'Anime deleted!' });
          }
        })
      }
    })
  });

  router.post('/changeCategory', (req, res) => {
    Anime.findOneAndUpdate({ "_id": ObjectID(req.body.id) }, { $set: { category: req.body.category } }, (err, anime) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "Category updated!" });
      }
    })
  })

  router.post('/fetchAnime', (req, res) => {
    Anime.find({ user: req.body.user}, (err, animeList) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, animeList: animeList})
      }
    })
  })

  router.post('/malSearch', (req, res) => {
    const query = encodeURIComponent(req["body"]["query"]);
    const parser = require('xml2json');
    const request = require('request');
    request.get({url: 'https://area11-burn:yuibestgirl4ever@myanimelist.net/api/anime/search.xml?q=' + query}, function (err, response, body) {
      if (!err) {
        let jsonString = parser.toJson(body);
        res.json({ success: true, data: JSON.parse(jsonString.toString())["anime"]["entry"] });
      } else {
        res.json({ success: false, message: err.toString()})
        return;   // We need this because of a weird error that happens in express due to the way errors are handled
      }
    });
  });

  router.post('/addAnimeToCatalog', (req, res) => {
    const anime = req.body.anime;
    // First check to make sure they haven't added this anime already
    Anime.findOne({ user: anime['user'], name: anime['name']}, (err, animeF) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (animeF) {
        res.json({ success: false, message: 'Anime already in catalog'});
      } else {
        Anime.findOne({ user: anime['user'], malID: anime['malID']}, (err, animeFF) => {
          if (err) {
            res.json({ success: false, message: err })
            return;
          } else if (animeFF) {
            res.json({ success: false, message: 'Anime already in catalog'});
            return;
          } else {
            let newAnime = new Anime({
              user: anime['user'],
              name: anime['name'],
              description: anime['description'],
              rating: anime['rating'],
              thumbnail: anime['thumbnail'],
              malID: anime['malID'],
              category: anime['category'],
              isFinalist: anime['isFinalist'],
              genres: anime['genres']
            });
            newAnime.save((err) => {
              if (err) {
                res.json({ success: false, message: err });
              } else {
                res.json({ success: true, message: 'Anime added to catalog!' });
              }
            });
          }
        });
      }
    });
  });

  router.post('/changeFinalistStatus', (req, res) => {
    Anime.findOneAndUpdate({ "_id": ObjectID(req.body.id) }, { $set: { isFinalist: req.body.newStatus, comments: (req.body.comments ? req.body.comments : []) } }, (err, anime) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "Finalist status changed!" });
      }
    })
  })

  router.get('/getUserInfo', (req, res) => {
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, user: user });
      }
    })
  });

  router.post('/saveUserChanges', (req, res) => {
    User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { bestgirl: req.body.bestgirl, avatar: req.body.avatar } }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "User changes saved!" });
      }
    })
  });

  router.post('/createGroup', (req, res) => {
    let newGroup = new Group({
      "name": req.body.name,
      "members": [req.decoded.userId],
      "membernames": [req.body.username]
    });
    newGroup.save((err) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        // Also have to update users
        User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: req.body.name }}, (err, user) => {
          if (err || !user) {
            // Need to remove the group we just created if we couldn't complete the whole function
            Group.findOne({ "name": req.body.name }).remove().exec();
            res.json({ success: false, message: err});
          } else {
            res.json({ success: true, message: 'New group created!' });
          }
        });
      }
    });
  });

  router.post('/getGroupInfo', (req, res) => {
    Group.findOne({ "name": req.body.name }, (err, group) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!group) {
        // Group doesn't exist anymore--delete relevant info from user document
        User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.json({ success: false, message: "No group found" });
          }
        })
      } else {
        // First make sure that user is a part of this group
        let found = false;
        for (let member of group.members) {
          if (member == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          res.json({ success: false, message: "Invalid group membership" });
        } else {
          res.json({ success: true, group: group })
        }
      }
    })
  });

  router.post('/disbandGroup', (req, res) => {
    Group.findOne({ "name": req.body.name }, (err, group) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!group) {
        // Group doesn't exist anymore--delete relevant info from user document
        User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.json({ success: false, message: "No group found" });
          }
        })
      } else {
        // First make sure that user is a part of this group
        let found = false;
        for (let member of group.members) {
          if (member == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          res.json({ success: false, message: "Invalid group membership" });
        } else {
          Group.findOne({ "name": req.body.name }).remove().exec();
          res.json({ success: true, message: "Group successfully deleted" });
        }
      }
    })
  })

  return router;
}
