const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Anime = require('../models/anime.js');
const User = require('../models/user.js');
const Group = require('../models/group.js');
const TopTens = require('../models/toptens.js');
const multer = require('multer');
const async = require('async');
const fs = require('fs');

// Make sure Area11/public exists; if not then create it
if (!fs.existsSync('Area11/public') ){
    fs.mkdirSync('Area11/public/');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Area11/public/')
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

  router.post('/upload', upload.single('uploadAvatar'), function(req, res) {
    // TODO: There must be a way to check if this failed somehow; right now we're just assuming it worked
    res.json( {"success": true} );
  });

  router.get('/getUserInfo', (req, res) => {
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, user: user });
      }
    });
  });

  router.post('/deleteAccount', (req, res) => {
    // First check if username matches logged in user
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!user) {
        res.json({ success: false, message: "User doesn't exist" })
      } else {
        if (user.username != req.body.username) {
          res.json({ success: false, message: "Invalid username" })
        } else if (!user.group) {
          User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
          fs.unlink('Area11/public/' + req.decoded.userId, (err) => {
            if (err) {
              // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
              console.log(err);
            }
          });
          Anime.find({ user: user.username }).remove().exec();
          res.json({ success: true, message: "User successfully deleted!" });
        } else {
          // If use is in group we need to remove them from group too
          Group.findOne({ "name": user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (!group) {
              User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
              fs.unlink('Area11/public/' + req.decoded.userId, (err) => {
                if (err) {
                  // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                  console.log(err);
                }
              });
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
                // If deleting group, also delete all top tens associated with group
                TopTens.find({ "group": group.name }).remove().exec();
                fs.unlink('Area11/public/' + group.name, (err) => {
                  if (err) {
                    // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                    console.log(err);
                  }
                });
              } else {
                Group.findOneAndUpdate({ "name": group.name}, { $set: { members: newMembers } }, (err, group) => {
                  if (err) {
                    res.json({ success: false, message: err });
                  } else {
                    // Remove this user from recommenders lists for other group members' anime
                    let memberNames = [];
                    async.each(group.members, function getMemberName (member, done) {
                      if (!member.isPending && member.id != req.decoded.userId) {
                        User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                          if (err) {
                            done();
                          } else if (!memberUser) {
                            done();
                          } else {
                            memberNames.push(memberUser.username);
                            done();
                          }
                        });
                      } else {
                        done();
                      }
                    }, function allDone (err) {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else {
                        Anime.update({ user: { $in: memberNames } }, { $pull: { recommenders: { name: req.body.username } } }, { multi: true }, (err) => {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            // Update top tens for group
                            TopTens.find({ group: group.name}, (err, ttList) => {
                              if (err) {
                                res.json({ success: false, message: err });
                              } else if (!ttList) {
                                User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
                                fs.unlink('Area11/public/' + req.decoded.userId, (err) => {
                                  if (err) {
                                    // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                                    console.log(err);
                                  }
                                });
                                Anime.find({ user: user.username }).remove().exec();
                                res.json({ success: true, message: "User successfully deleted!" });
                              } else {
                                async.each(ttList, function(toptensObj, done2) {
                                  if (!toptensObj.entries) {
                                    done2();
                                  } else {
                                    let newEntries = [];
                                    for (let entry of toptensObj.entries) {
                                      let newEntry = {name: entry.name}
                                      let newViewerPrefs = [];
                                      for (let viewerPref of entry.viewerPrefs) {
                                        if (viewerPref.member != user.username) {
                                          newViewerPrefs.push(viewerPref)
                                        }
                                      }
                                      newEntry.viewerPrefs = newViewerPrefs;
                                      newEntries.push(newEntry);
                                    }
                                    TopTens.update({ "category": toptensObj.category, "user": toptensObj.user }, { entries: newEntries }, done2);
                                  }
                                }, function allDone2(err) {
                                  if (err) {
                                    res.json({ success: false, message: err });
                                  } else {
                                    User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
                                    fs.unlink('Area11/public/' + req.decoded.userId, (err) => {
                                      if (err) {
                                        // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                                        console.log(err);
                                      }
                                    });
                                    Anime.find({ user: user.username }).remove().exec();
                                    TopTens.find({ user: user.username }).remove().exec();
                                    res.json({ success: true, message: "User successfully deleted!" });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  });

  router.post('/saveUserChanges', (req, res) => {
    // For user settings page
    User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { bestgirl: req.body.bestgirl, avatar: req.body.avatar, autoTimelineAdd: req.body.autoTimelineAdd, fireworks: req.body.fireworks, bestboy: req.body.bestboy, bioDisplay: req.body.bioDisplay } }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "User changes saved!"})
      }
    });
  });

  return router;
}
