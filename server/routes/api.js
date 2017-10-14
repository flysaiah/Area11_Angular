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
        // Update profile avatar in groups info as well
        if (user && user["group"]) {
          Group.findOne({ name: user["group"] }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (group) {
              let newMembers = group.members;
              for (let member of newMembers) {
                if (member.id == req.decoded.userId) {
                  member.avatar = req.body.avatar;
                }
              }
              Group.findOneAndUpdate({ name: user["group"] }, { $set: { members: newMembers } }, (err, group2) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: "User changes saved!" });
                }
              });
            } else {
              res.json({ success: true, message: "User changes saved!" });
            }
          });
        }
      }
    });
  });

  router.post('/createGroup', (req, res) => {
    let newGroup = new Group({
      "name": req.body.name,
      "members": [{
        id: req.decoded.userId,
        username: req.body.username,
        isPending: false,
        avatar: req.body.userAvatar
      }],
      "avatar": req.body.groupAvatar
    });
    console.log(newGroup);
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

  router.post('/joinGroupRequest', (req, res) => {
    Group.findOne({ name: req.body.groupName }, (err, group) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!group) {
        res.json({ success: false, message: "No group found" });
      } else{
        // We want to let them know if they're already sent a request
        let found = false;
        for (let member of group.members) {
          if (req.body.username == member.username && member.isPending) {
            found = true;
          }
        }
        if (found) {
          res.json({ success: false, message: "Already requested"});
        } else {
          let newMembers = group.members;
          newMembers.push({
            id: req.decoded.userId,
            username: req.body.username,
            isPending: true
          });
          Group.findOneAndUpdate({ name: req.body.groupName, }, { $set: { members: newMembers }}, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: true, message: "Successfully requested membership!"})
            }
          })
        }
      }
    })
  });

  router.post('/acceptUserRequest', (req, res) => {
    // First check if user is actually in the group
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
          if (member.id == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          res.json({ success: false, message: "Invalid group membership" });
        } else {
          // Here's where the user request part takes place
          // First check if user hasn't already been added
          for (let member of group.members) {
            if (req.body.pendingUser == member.username && !member.isPending) {
              res.json({ success: false, message: "Already in group" });
              return;
            }
          }
          // Remove user from pending, then add
          let newMembers = group.members;
          for (let i=0; i<newMembers.length; i++) {
            if (newMembers[i].username == req.body.pendingUser) {
              newMembers[i].isPending = false;
              break;
            }
          }
          Group.findOneAndUpdate( { "name": req.body.name }, { $set: { members: newMembers } }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              // Remember to update new user also
              User.findOneAndUpdate( { "username": req.body.pendingUser }, { $set: { group: req.body.name } }, (err, user) => {
                if (err) {
                  // TODO: Undo changes to group
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: "Group successfully deleted" });
                }
              });
            }
          });
        }
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
          if (member.id == req.decoded.userId) {
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
          if (member.id == req.decoded.userId) {
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
    });
  });

  router.post('/importCatalog', (req, res) => {
    Anime.find({ "user": req.body.fromUser }, (err, fromUserList) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        if (!fromUserList) {
          res.json({ success: false, message: "Nothing to import"});
        } else {
          // Import each not-already-existing MAL-linked anime
          for (let anime of fromUserList) {
            if (anime["malID"]) {
              Anime.findOne({ "malID":  anime["malID"], "user": req.body.toUser }, (err, existingAnime) => {
                if (err) {
                  res.json({ success: false, message: err });
                  return;
                } else if (!existingAnime) {
                  const newAnime = new Anime({
                    user: req.body.toUser,
                    name: anime['name'],
                    description: anime['description'],
                    rating: anime['rating'],
                    thumbnail: anime['thumbnail'],
                    malID: anime['malID'],
                    category: 'Considering',
                    isFinalist: false,
                    genres: anime['genres']
                  });
                  newAnime.save((err) => {
                    if (err) {
                      res.json({ success: false, message: err });
                      return;
                    }
                  });
                }
              });
            }
          }
          res.json({ success: true, message: "Successful import!" });
        }
      }
    });
  });

  return router;
}
