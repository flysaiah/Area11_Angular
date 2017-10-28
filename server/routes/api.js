// Contains all API hooks except those used for authentication
const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Anime = require('../models/anime.js');
const User = require('../models/user.js');
const Group = require('../models/group.js');
const path = require('path');
const multer = require('multer');
const async = require('async');
const fs = require('fs');

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
        // if user has recommended this anime, we have to remove recommendation from group members' versions of anime
        if (!anime.ownerIsRecommender || !anime.malID) {
          anime.remove((err) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: true, message: 'Anime deleted!' });
            }
          });
        }
        User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
          if (err) {
            res.json({ success: false, message: err });
          } else if (!user) {
            res.json({ success: false, message: "User not found" });
          } else {
            if (!user.group) {
              anime.remove((err) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: 'Anime deleted!' });
                }
              });
            } else {
              Group.findOne({ "name": user.group }, (err, group) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else if (!group) {
                  // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
                  anime.remove((err) => {
                    if (err) {
                      res.json({ success: false, message: err });
                    } else {
                      res.json({ success: true, message: 'Anime deleted!' });
                    }
                  });
                } else {
                  let found = false;
                  for (let member of group.members) {
                    if (!member.isPending && member.id == req.decoded.userId) {
                      found = true;
                    }
                  }
                  if (!found) {
                    anime.remove((err) => {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else {
                        res.json({ success: true, message: 'Anime deleted!' });
                      }
                    });
                  } else {
                    // Fetch names of group members
                    let memberNames = [];
                    async.each(group.members, function getMemberName (member, done) {
                      if (!member.isPending) {
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
                        Anime.update({ malID: anime.malID, user: { $in: memberNames } }, { $pull: { recommenders: { name: user.username } } }, { multi: true }, (err) => {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            anime.remove((err) => {
                              if (err) {
                                res.json({ success: false, message: err });
                              } else {
                                res.json({ success: true, message: 'Anime deleted!' });
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
      }
    });
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

            // Update recommenations if user is in a group
            if (!newAnime.malID) {
              newAnime.save((err) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  res.json({ success: true, message: 'Anime added to catalog!' });
                }
              });
            } else {
              User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else if (!user) {
                  res.json({ success: false, message: "User doesn't exist" })
                } else {
                  // Next check if user is in group--if not, we just save this anime
                  if (!user.group) {
                    newAnime.save((err) => {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else {
                        res.json({ success: true, message: 'Anime added to catalog!' });
                      }
                    });
                  } else {
                    // Check if group is valid & user is in this group
                    Group.findOne({ "name": user.group }, (err, group) => {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else if (!group) {
                        // Group doesn't exist anymore--delete relevant info from user document & continue with add
                        User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            newAnime.save((err) => {
                              if (err) {
                                res.json({ success: false, message: err });
                              } else {
                                res.json({ success: true, message: 'Anime added to catalog!' });
                              }
                            });
                          }
                        });
                      } else {
                        let found = false;
                        let numMembers = 0;
                        for (let member of group.members) {
                          if (!member.isPending) {
                            numMembers += 1;
                          }
                          if (!member.isPending && member.id == req.decoded.userId) {
                            found = true;
                          }
                        }
                        if (!found || numMembers == 1) {
                          newAnime.save((err) => {
                            if (err) {
                              res.json({ success: false, message: err });
                            } else {
                              res.json({ success: true, message: 'Anime added to catalog!' });
                            }
                          });
                        } else {
                          // Grab the relevant recommendations from the group members
                          // Use all member names because we don't know who (if anyone) also has this anime
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
                              Anime.findOne({ malID: newAnime.malID, user: { $in: memberNames } }, (err, memberAnime) => {
                                if (err) {
                                  res.json({ success: false, message: err });
                                } else if (!memberAnime) {
                                  newAnime.save((err) => {
                                    if (err) {
                                      res.json({ success: false, message: err });
                                    } else {
                                      res.json({ success: true, message: 'Anime added to catalog!' });
                                    }
                                  });
                                } else {
                                  if (memberAnime.recommenders) {
                                    newAnime.recommenders = memberAnime.recommenders;
                                  }
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
                        }
                      }
                    });
                  }
                }
              });
            }
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
  });

  router.post('/recommendAnime', (req,res) => {
    // First make sure username matches currently-logged-in-user
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!user) {
        res.json({ success: false, message: "User doesn't exist" })
      } else if (user.username != req.body.recommender) {
        res.json({ success: false, message: "Invalid username" });
      } else {
        // Next check if user is in group--if not, we just update this anime
        if (!user.group) {
          Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } }, (err) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: true, message: "Anime recommended successfully!" });
            }
          });
        } else {
          // Check if group is valid & user is in this group
          Group.findOne({ "name": user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (!group) {
              // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
              User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } }, (err) => {
                    if (err) {
                      res.json({ success: false, message: err });
                    } else {
                      res.json({ success: true, message: "Anime recommended successfully!" });
                    }
                  });
                }
              });
            } else {
              let found = false;
              for (let member of group.members) {
                if (!member.isPending && member.id == req.decoded.userId) {
                  found = true;
                }
              }
              if (!found) {
                Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } }, (err) => {
                  if (err) {
                    res.json({ success: false, message: err });
                  } else {
                    res.json({ success: true, message: "Anime recommended successfully!" });
                  }
                });
              } else {
                // Fetch names of group members
                let memberNames = [];
                async.each(group.members, function getMemberName (member, done) {
                  if (!member.isPending) {
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
                    // HACK: To ensure they don't add themselves multiple times as recommenders by mashing the button or something we pull first as that doesn't fail
                    Anime.update({ malID: req.body.anime.malID, user: { $in: memberNames } }, { $pull: { recommenders: { name: req.body.recommender } } }, { multi: true }, (err) => {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else {
                        Anime.update({ malID: req.body.anime.malID, user: { $in: memberNames } }, { $push: { recommenders: { name: req.body.recommender } } }, { multi: true }, (err) => {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            Anime.update({ malID: req.body.anime.malID, user: req.body.recommender }, { $set: { ownerIsRecommender: true } }, (err) => {
                              if (err) {
                                res.json({ success: false, message: err });
                              } else {
                                res.json({ success: true, message: "Anime recommended successfully!" });
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

  router.post('/undoRecommendAnime', (req, res) => {
    // First make sure username matches currently-logged-in-user
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!user) {
        res.json({ success: false, message: "User doesn't exist" })
      } else if (user.username != req.body.recommender) {
        res.json({ success: false, message: "Invalid username" });
      } else {
        // Next check if user is in group--if not, we just update this anime
        if (!user.group) {
          Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [], ownerIsRecommender: false } }, (err) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              res.json({ success: true, message: "Undo recommend was successful!" });
            }
          });
        } else {
          // Check if group is valid & user is in this group
          Group.findOne({ "name": user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (!group) {
              // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
              User.findOneAndUpdate({ "_id": ObjectID(req.decoded.userId) }, { $set: { group: "" } }, (err, user) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [], ownerIsRecommender: false } }, (err) => {
                    if (err) {
                      res.json({ success: false, message: err });
                    } else {
                      res.json({ success: true, message: "Undo recommend was successful!" });
                    }
                  });
                }
              });
            } else {
              let found = false;
              for (let member of group.members) {
                if (!member.isPending && member.id == req.decoded.userId) {
                  found = true;
                }
              }
              if (!found) {
                Anime.update({"_id": ObjectID(req.body.anime._id)}, { $set: { recommenders: [], ownerIsRecommender: false } }, (err) => {
                  if (err) {
                    res.json({ success: false, message: err });
                  } else {
                    res.json({ success: true, message: "Anime recommended successfully!" });
                  }
                });
              } else {
                // Fetch names of group members
                let memberNames = [];
                async.each(group.members, function getMemberName (member, done) {
                  if (!member.isPending) {
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
                    Anime.update({ malID: req.body.anime.malID, user: { $in: memberNames } }, { $pull: { recommenders: {name: req.body.recommender } } }, { multi: true }, (err) => {
                      if (err) {
                        res.json({ success: false, message: err });
                      } else {
                        Anime.update({ malID: req.body.anime.malID, user: req.body.recommender }, { $set: { ownerIsRecommender: false } }, (err) => {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            res.json({ success: true, message: "Undo recommend successful!" });
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
          fs.unlink('./public/' + req.decoded.userId, (err) => {
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
              fs.unlink('./public/' + req.decoded.userId, (err) => {
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
                fs.unlink('./public/' + group.name, (err) => {
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
                            User.findOne({ "_id": ObjectID(req.decoded.userId) }).remove().exec();
                            fs.unlink('./public/' + req.decoded.userId, (err) => {
                              if (err) {
                                // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                                console.log(err);
                              }
                            });
                            Anime.find({ user: user.username }).remove().exec();
                            res.json({ success: true, message: "User successfully deleted!" });
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
              fs.unlink('./public/' + req.body.groupName, (err) => {
                if (err) {
                  // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                  console.log(err);
                }
              });
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
                      // Update recommendations
                      Anime.update({ user: user.username, ownerIsRecommender: true }, { $set: { recommenders: [{ name: user.username }] } }, { multi: true }, (err) => {
                        if (err) {
                          res.json({ success: false, message: err });
                        } else {

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
                              Anime.update({ user: { $in: memberNames } }, { $pull: { recommenders: {name: user.username } } }, { multi: true }, (err) => {
                                if (err) {
                                  res.json({ success: false, message: err });
                                } else {
                                  res.json({ success: true, message: "Left group successfully" });
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
        // First make sure that current user is a part of this group
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
                  // Now add recommendations from group anime' anime to new member
                  let memberNames = [];
                  let newMemberName = "";
                  async.each(group.members, function getMemberName (member, done) {
                    if (!member.isPending || member.id == req.body.pendingUser) {
                      User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                        if (err) {
                          done();
                        } else if (!memberUser) {
                          done();
                        } else {
                          if (member.id != req.body.pendingUser) {
                            memberNames.push(memberUser.username);
                          } else {
                            newMemberName = memberUser.username;
                          }
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
                      Anime.find({ user: { $in: memberNames } }, (err, groupAnimeList) => {
                        let malIDs = new Set();
                        async.eachSeries(groupAnimeList, function updateNewMemberRecommendations (groupMembAnime, done3) {
                          if (!groupMembAnime.malID || malIDs.has(groupMembAnime.malID) || !groupMembAnime.recommenders) {
                            done3()
                          } else {
                            malIDs.add(groupMembAnime.malID);
                            Anime.update({ malID: groupMembAnime.malID, user: newMemberName }, { $push: { recommenders: { $each: groupMembAnime.recommenders } } }, done3)
                          }
                        }, function allDone3 (err) {
                          if (err) {
                            res.json({ success: false, message: err });
                          } else {
                            // NOW do the converse, and add new group member's recommendations to all the existing group members' anime
                            Anime.find({ user: newMemberName }, (err, animeList) => {
                              if (err) {
                                res.json({ success: false, message: err });
                              } else if (!animeList) {
                                res.json({ success: true, message: "Successfully added to group" });
                              } else {
                                async.each(animeList, function updateRecommendations (membAnime, done2) {
                                  if (!membAnime.ownerIsRecommender || !membAnime.malID) {
                                    done2();
                                  } else {
                                    Anime.update({ malID: membAnime.malID, user: { $in: memberNames } }, { $push: { recommenders: { name: newMemberName } } }, { multi: true }, done2);
                                  }
                                }, function allDone2 (err) {
                                  if (err) {
                                    res.json({ success: false, message: err });
                                  } else {
                                    res.json({ success: true, message: "Successfully added to group" });
                                  }
                                });
                              }
                            });
                          }
                        });
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

  router.post('/saveGroupChanges', (req, res) => {
    Group.findOne({ "name": req.body.groupName }, (err, group) => {
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
          Group.findOneAndUpdate({ name: req.body.groupName }, { $set: { name: req.body.groupChangesModel.name } }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (req.body.groupName != req.body.groupChangesModel.name) {
              // If they changed the group name we have additional steps to take
              User.update({ group: req.body.groupName }, { $set: { group: req.body.groupChangesModel.name } }, {multi: true}, (err) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  fs.rename('./public/' + req.body.groupName, './public/' + req.body.groupChangesModel.name, (err) => {
                    if (err) {
                      // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
                      console.log(err)
                    }
                    res.json({ success: true, message: "Group changes saved successfully!" });
                  });
                }
              });
            } else {
              res.json({ success: true, message: "Group changes saved successfully!" });
            }
          });

        }
      }
    });  });

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
        });
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
          fs.unlink('./public/' + req.body.name, (err) => {
            if (err) {
              // Don't return a success: false here becuase this will always fail when they haven't uploaded an avatar
              console.log(err);
            }
          });

          // Update anime recommendations
          let memberNames = [];
          async.each(group.members, function getMemberName (member, done) {
            if (!member.isPending) {
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
              Anime.update({ user: { $in: memberNames }, ownerIsRecommender: false }, { $set: { recommenders: [] } }, { multi: true }, (err) => {
                if (err) {
                  res.json({ success: false, message: err });
                } else {
                  async.each(memberNames, function updateMemberRecommendations (memberName, done) {
                    Anime.update({ user: memberName, ownerIsRecommender: true }, { $set: { recommenders: [{ name: memberName }] } }, { multi: true }, done);
                  }, function allDone (err) {
                    if (err) {
                      res.json({ success: false, message: err });
                    } else {
                      res.json({ success: true, message: "Group successfully deleted" });
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  });

  router.post('/importCatalog', (req, res) => {
    // Adds all not-already-existing anime from one group member's catalog to another's 'Considering' category
    // First check to make sure current user is in the same group as fromUser
    Group.findOne({ "name": req.body.groupName }, (err, group) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        let found1 = false;
        let found2 = false;
        for (let member of group.members) {
          if (!member.isPending && member.id == req.decoded.userId) {
            found1 = true;
          } else if (!member.isPending && member.id == req.body.fromUserID) {
            found2 = true;
          }
        }
        if (!found1 || !found2) {
          res.json({ success: false, message: "Users not in same group" });
        } else {
          Anime.find({ "user": req.body.fromUser }, (err, fromUserList) => {
            if (err) {
              res.json({ success: false, message: err });
            } else {
              if (!fromUserList) {
                res.json({ success: false, message: "Nothing to import"});
              } else {
                // Import each not-already-existing MAL-linked anime
                let numOfImports = 0;
                async.each(fromUserList, function updateAnime (anime, done) {
                  if (anime["malID"]) {
                    Anime.findOne({ "malID":  anime["malID"], "user": req.body.toUser }, (err, existingAnime) => {
                      done();
                      if (err) {
                        done();
                        return;
                      } else if (!existingAnime) {
                        numOfImports += 1;
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
                          status: anime['status'],
                          recommenders: anime['recommenders']
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
                }, function allDone (err) {
                  if (err) {
                    res.json({ success: false, message: err });
                  } else {
                    // If there are a higher number of anime the count can be a litte off, so we wait for .5 sec
                    setTimeout(() => {
                      res.json({ success: true, message: numOfImports });
                    }, 500)
                  }
                });
              }
            }
          });
        }
      }
    });
  });

  return router;
}
