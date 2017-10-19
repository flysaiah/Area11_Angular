// Contains all API hooks except those used for authentication
const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Anime = require('../models/anime.js');
const User = require('../models/user.js');
const Group = require('../models/group.js');
const path = require('path');
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public')
  },
  filename: function (req, file, cb) {
    // Distinguish between group & user uploads
    if (file.originalname == "area11-user-avatar") {
      cb(null, req.decoded.userId);
    } else {
      cb(null, file.originalname);
    }
  }
});

const upload = multer({ storage: storage });

module.exports = (router) => {

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
  });

  router.post('/upload', upload.single('uploadAvatar'), function(req, res) {
    // TODO: There must be a way to check if this failed somehow; right now we're just assuming it worked
    res.json( {"success": true} );
  });

  router.post('/fetchAnime', (req, res) => {
    // Fetches all anime in the database associated with the current user
    Anime.find({ user: req.body.user}, (err, animeList) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, animeList: animeList})
      }
    })
  });

  router.post('/malSearch', (req, res) => {
    // Query myanimelist API for info based on name of anime
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
            // Now we can add anime
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
    // Either add as finalist or remove finalist depending on newStatus
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

  router.post('/deleteAccount', (req, res) => {
    // First check if user is in a group; if so, we need to remove them from group too
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        if (!user.group) {
          User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
          res.json({ success: true, message: "User successfully deleted!" });
        } else {
          Group.findOne({ "name": user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (!group) {
              User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
              res.json({ success: true, message: "User successfully deleted!" });
            } else {
              // Group exists
              let newMembers = [];
              let count = 0;
              for (let member of group.members) {
                if (!member.isPending) {
                  count += 1;
                }
                if (member.id != req.decoded.userId) {
                  newMembers.push(member);
                }
              }
              // If last member of group, delete group
              if (count == 1) {
                Group.findOne({ "name": group.name }).remove().exec();
              } else {
                Group.findOneAndUpdate({ "name": group.name}, { $set: { members: newMembers } }, (err, group) => {
                  if (err) {
                    res.json({ success: false, message: err });
                  } else {
                    User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
                    res.json({ success: true, message: "User successfully deleted!" });
                  }
                });
              }
              Group.findOneAndUpdate({ "name": group.name}, { $set: { members: newMembers } }, (err, group) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
                  res.json({ success: true, message: "User successfully deleted!" });
                }
              });
            }
          })
        }
      }
    })
  });

  router.post('/saveUserChanges', (req, res) => {
    // For user settings page
    User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { bestgirl: req.body.bestgirl, avatar: req.body.avatar } }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "User changes saved!"})
      }
    });
  });

  router.post('/createGroup', (req, res) => {
    // Create group with current user as sole member
    let newGroup = new Group({
      "name": req.body.name,
      "members": [{
        id: req.decoded.userId,
        isPending: false,
      }]
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

  router.post('/leaveGroup', (req, res) => {
    // Remove current user from his/her associated group
    if (!req.body.groupName) {
      res.json({ success: false, message: "No group name provided" });
    } else {
      Group.findOne({ name: req.body.groupName }, (err, group) => {
        if (err) {
          res.json({ success: false, message: err });
        } else {
          let found = false;
          let count = 0;
          let newMembers = [];
          for (let member of group.members) {
            if (!member.isPending) {
              count += 1;
            }
            if (member.id == req.decoded.userId) {
              found = true;
            } else {
              newMembers.push(member);
            }
          }
          if (!found) {
            res.json({ success: false, message: "Invalid group membership" });
          } else {
            // If this was the only member, then remove group
            if (count == 1) {
              Group.findOne({ "name": req.body.groupName }).remove().exec();
              User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: "Left group successfully" });
                }
              })
            } else {
              Group.findOneAndUpdate({ "name": req.body.groupName }, { $set: { members: newMembers } }, (err, group) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
                    if (err) {
                      res.json({ success: false, message: err });
                    } else {
                      res.json({ success: true, message: "Left group successfully" });
                    }
                  });
                }
              });
            }
          }
        }
      });
    }
  });

  router.post('/joinGroupRequest', (req, res) => {
    // Send a request to join a group; adds user as a group member with isPending = true
    Group.findOne({ name: req.body.groupName }, (err, group) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!group) {
        res.json({ success: false, message: "No group found" });
      } else{
        // We want to let them know if they're already sent a request
        let found = false;
        for (let member of group.members) {
          if (req.decoded.userId == member.id && member.isPending) {
            found = true;
          }
        }
        if (found) {
          res.json({ success: false, message: "Already requested"});
        } else {
          let newMembers = group.members;
          newMembers.push({
            id: req.decoded.userId,
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

  router.post('/rejectUserRequest', (req, res) => {
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
          if (!member.isPending && member.id == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          res.json({ success: false, message: "Invalid group membership" });
        } else {
          // Here's where the user request part takes place
          // First check if user hasn't already been added
          for (let member of group.members) {
            if (req.body.pendingUser == member.id && !member.isPending) {
              res.json({ success: false, message: "Already in group" });
              return;
            }
          }
          let newMembers = [];
          for (let member of group.members) {
            if (member.id != req.body.pendingUser) {
              newMembers.push(member);
            }
          }
          Group.findOneAndUpdate( { "name": req.body.name }, { $set: { members: newMembers } }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: true, message: "Successfully rejected user" });
            }
          });
        }
      }
    });
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
          if (!member.isPending && member.id == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          res.json({ success: false, message: "Invalid group membership" });
        } else {
          // Here's where the user request part takes place
          // First check if user hasn't already been added
          for (let member of group.members) {
            if (req.body.pendingUser == member.id && !member.isPending) {
              res.json({ success: false, message: "Already in group" });
              return;
            }
          }
          // Change isPending status to officially "add" user
          let newMembers = group.members;
          for (let i=0; i<newMembers.length; i++) {
            if (newMembers[i].id == req.body.pendingUser) {
              newMembers[i].isPending = false;
              break;
            }
          }
          Group.findOneAndUpdate( { "name": req.body.name }, { $set: { members: newMembers } }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              // Remember to update new user also
              User.findOneAndUpdate( { "_id": ObjectID(req.body.pendingUser) }, { $set: { group: req.body.name } }, (err, user) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: "Successfully added to group" });
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
          if (!member.isPending && member.id == req.decoded.userId) {
            found = true;
          }
        }
        if (!found) {
          User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: false, message: "Invalid group membership" });
            }
          })
        } else {
          // Query for group member data
          // Use map because later we'll need to remember isPending status
          let groupMembers = [];
          let groupMemberMap = new Map();
          for (let member of group.members) {
            groupMembers.push(ObjectID(member.id));
            groupMemberMap.set(member.id, member.isPending);
          }
          User.find({ "_id": { $in: groupMembers } }, (err, members) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (members) {
              // Need to modify members so we can remove password and include isPending
              let newMembers = [];
              for (let member of members) {
                newMembers.push({
                  id: member.id,
                  username: member.username,
                  bestgirl: member.bestgirl,
                  avatar: (member.avatar ? member.avatar : ""),
                  isPending: groupMemberMap.get(member.id)
                })
              }
              let groupObj = {
                name: group.name,
                members: newMembers,
              }
              res.json({ success: true, group: groupObj })
            } else {
              res.json({ success: false, message: "Unknown error in /getGroupInfo" })
            }
          });
        }
      }
    });
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
          if (!member.isPending && member.id == req.decoded.userId) {
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
    // Adds all not-already-existing anime from one group member's catalog to another's 'Considering' category
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
                    genres: anime['genres'],
                    startDate: anime['startDate'],
                    endDate: anime['endDate'],
                    type: anime['type'],
                    englishTitle: anime['englishTitle'],
                    status: anime['status']
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
