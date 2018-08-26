const ObjectID = require('mongodb').ObjectID
const Anime = require('../models/anime.js')
const User = require('../models/user.js')
const Group = require('../models/group.js')
const async = require('async')
const Horseman = require('node-horseman')

module.exports = router => {
  router.post('/removeAnimeFromCatalog', (req, res) => {
    Anime.findOne({ _id: ObjectID(req.body.id) }, (err, anime) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!anime) {
        res.json({ success: false, message: 'Already deleted' })
      } else {
        User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
          if (err) {
            res.json({ success: false, message: err })
          } else if (!user) {
            res.json({ success: false, message: 'User not found' })
          } else if (user.username != anime.user) {
            res.json({ success: false, message: 'Invalid User' })
          } else if (!anime.ownerIsRecommender || !anime.malID) {
            // if user has recommended this anime, we have to remove recommendation from group members' versions of anime
            anime.remove(err => {
              if (err) {
                res.json({ success: false, message: err })
              } else {
                res.json({ success: true, message: 'Anime deleted!' })
              }
            })
          } else {
            if (!user.group) {
              anime.remove(err => {
                if (err) {
                  res.json({ success: false, message: err })
                } else {
                  res.json({ success: true, message: 'Anime deleted!' })
                }
              })
            } else {
              Group.findOne({ name: user.group }, (err, group) => {
                if (err) {
                  res.json({ success: false, message: err })
                } else if (!group) {
                  // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
                  anime.remove(err => {
                    if (err) {
                      res.json({ success: false, message: err })
                    } else {
                      res.json({ success: true, message: 'Anime deleted!' })
                    }
                  })
                } else {
                  let found = false
                  for (let member of group.members) {
                    if (!member.isPending && member.id == req.decoded.userId) {
                      found = true
                    }
                  }
                  if (!found) {
                    anime.remove(err => {
                      if (err) {
                        res.json({ success: false, message: err })
                      } else {
                        res.json({ success: true, message: 'Anime deleted!' })
                      }
                    })
                  } else {
                    // Fetch names of group members
                    let memberNames = []
                    async.each(
                      group.members,
                      function getMemberName(member, done) {
                        if (!member.isPending) {
                          User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                            if (err) {
                              done()
                            } else if (!memberUser) {
                              done()
                            } else {
                              memberNames.push(memberUser.username)
                              done()
                            }
                          })
                        } else {
                          done()
                        }
                      },
                      function allDone(err) {
                        if (err) {
                          res.json({ success: false, message: err })
                        } else {
                          Anime.update(
                            { malID: anime.malID, user: { $in: memberNames } },
                            { $pull: { recommenders: { name: user.username } } },
                            { multi: true },
                            err => {
                              if (err) {
                                res.json({ success: false, message: err })
                              } else {
                                anime.remove(err => {
                                  if (err) {
                                    res.json({ success: false, message: err })
                                  } else {
                                    res.json({ success: true, message: 'Anime deleted!' })
                                  }
                                })
                              }
                            },
                          )
                        }
                      },
                    )
                  }
                }
              })
            }
          }
        })
      }
    })
  })

  router.post('/changeCategory', (req, res) => {
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        res.json({ success: false, message: 'User not found' })
      } else {
        Anime.findOneAndUpdate(
          { _id: ObjectID(req.body.id), user: user.username },
          { $set: { category: req.body.category } },
          (err, anime) => {
            if (err) {
              res.json({ success: false, message: err })
            } else if (!anime) {
              res.json({ success: false, message: 'Anime not found' })
            } else {
              res.json({ success: true, message: 'Category updated!' })
            }
          },
        )
      }
    })
  })

  router.post('/fetchAnime', (req, res) => {
    // Fetches all anime in the database associated with the current user
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        res.json({ success: false, message: 'User not found' })
      } else if (user.username != req.body.user) {
        // prettier-ignore
        res.json({ success: false, message: 'Username in request doesn\'t match current user' })
      } else {
        Anime.find({ user: req.body.user }, (err, animeList) => {
          if (err) {
            res.json({ success: false, message: err })
          } else {
            res.json({ success: true, animeList: animeList })
          }
        })
      }
    })
  })

  // router.post('/malSearch', (req, res) => {
  //   // Query myanimelist API for info based on name of anime
  //   const query = encodeURIComponent(req["body"]["query"]);
  //   const parser = require('xml2json');
  //   const request = require('request');
  //   request.get({url: 'https://area11-burn:yuibestgirl4ever@myanimelist.net/api/anime/search.xml?q=' + query}, function (err, response, body) {
  //     if (!err) {
  //       let jsonString = parser.toJson(body);
  //       res.json({ success: true, data: JSON.parse(jsonString.toString())["anime"]["entry"] });
  //     } else {
  //       res.json({ success: false, message: err.toString()})
  //       return;   // We need this because of a weird error that happens in express due to the way errors are handled
  //     }
  //   });
  // });

  router.post('/addAnimeToCatalog', (req, res) => {
    // TODO: Put this in a python script and run it on the side
    const horseman = new Horseman({
      timeout: 5000,
      loadImages: false,
      injectJquery: false,
    })
    horseman
      .open(req.body.malURL)
      .html()
      .then(stuff => {
        // Description
        const description = stuff.split('<span itemprop="description">')[1].split('</span>')[0]
        // Rating
        let rating
        let r = stuff.split('<span itemprop="ratingValue">')
        if (r.length > 1) {
          rating = r[1].split('</span>')[0].trim()
        }
        // Thumbnail
        const thumbnail = stuff
          .split('<meta property="og:image" content="')[1]
          .split('">')[0]
          .trim()
        // Genres
        let genreArr = []
        const foo = stuff
          .split('Genres:')[1]
          .split('</div>')[0]
          .replace(/["]+/g, '')
          .split('title=')
        for (let i = 1; i < foo.length; i++) {
          let tmp = foo[i]
          genreArr.push(tmp.split('<a')[0].split('>')[0])
        }
        // Start Date & End Date
        const airing = stuff
          .split('<span class="dark_text">Aired:</span>')[1]
          .split('</div>')[0]
          .trim()
        let startDate = 'Unknown'
        let endDate = 'Unknown'
        if (airing.split(' to ').length > 1) {
          let start = new Date(airing.split(' to ')[0])
          let end = new Date(airing.split(' to ')[1])
          if (start.toLocaleDateString() == 'Invalid Date') {
            startDate = airing.split(' to ')[0]
          } else {
            startDate = start.toLocaleDateString()
          }
          if (end.toLocaleDateString() == 'Invalid Date') {
            endDate = airing.split(' to ')[1]
          } else {
            endDate = end.toLocaleDateString()
          }
        }
        // Type
        const type = stuff
          .split('<span class="dark_text">Type:</span>')[1]
          .split('</a></div>')[0]
          .split('>')[1]
          .trim()
        // English Title
        let englishTitle = 'Unknown'
        let et = stuff.split('English:</span>')
        if (et.length > 1) {
          englishTitle = et[1].split('</div>')[0].trim()
        }
        const status = stuff
          .split('<span class="dark_text">Status:</span>')[1]
          .split('</div>')[0]
          .trim()
        const name = stuff
          .split('<h1 class="h1"><span itemprop="name">')[1]
          .split('</span></h1>')[0]
          .trim()
        const malID = req.body.malURL.split('/anime/')[1].split('/')[0]

        User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
          if (err) {
            res.json({ success: false, message: err })
          } else if (!user) {
            res.json({ success: false, message: 'User not found' })
          } else {
            // First check to make sure they haven't added this anime already
            Anime.findOne({ user: user.user, name: name }, (err, animeF) => {
              if (err) {
                res.json({ success: false, message: err })
              } else if (animeF) {
                res.json({ success: false, message: 'Anime already in catalog' })
              } else {
                Anime.findOne({ user: user.username, malID: malID }, (err, animeFF) => {
                  if (err) {
                    res.json({ success: false, message: err })
                    return
                  } else if (animeFF && malID) {
                    res.json({ success: false, message: 'Anime already in catalog' })
                    return
                  } else {
                    // Now we can add anime
                    let newAnime = new Anime({
                      user: user.username,
                      name: name,
                      description: description,
                      rating: rating,
                      thumbnail: thumbnail,
                      malID: malID,
                      category: req.body.category,
                      isFinalist: false,
                      genres: genreArr,
                      startDate: startDate,
                      endDate: endDate,
                      type: type,
                      englishTitle: englishTitle,
                      status: status,
                    })

                    // Update recommenations if user is in a group
                    if (!newAnime.malID) {
                      newAnime.save(err => {
                        if (err) {
                          res.json({ success: false, message: err })
                        } else {
                          res.json({ success: true, message: 'Anime added to catalog!' })
                        }
                      })
                    } else {
                      User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
                        if (err) {
                          res.json({ success: false, message: err })
                        } else if (!user) {
                          // prettier-ignore
                          res.json({ success: false, message: 'User doesn\'t exist' })
                        } else {
                          // Next check if user is in group--if not, we just save this anime
                          if (!user.group) {
                            newAnime.save(err => {
                              if (err) {
                                res.json({ success: false, message: err })
                              } else {
                                res.json({ success: true, message: 'Anime added to catalog!' })
                              }
                            })
                          } else {
                            // Check if group is valid & user is in this group
                            Group.findOne({ name: user.group }, (err, group) => {
                              if (err) {
                                res.json({ success: false, message: err })
                              } else if (!group) {
                                // Group doesn't exist anymore--delete relevant info from user document & continue with add
                                User.findOneAndUpdate({ _id: ObjectID(req.decoded.userId) }, { $set: { group: '' } }, err => {
                                  if (err) {
                                    res.json({ success: false, message: err })
                                  } else {
                                    newAnime.save(err => {
                                      if (err) {
                                        res.json({ success: false, message: err })
                                      } else {
                                        res.json({ success: true, message: 'Anime added to catalog!' })
                                      }
                                    })
                                  }
                                })
                              } else {
                                let found = false
                                let numMembers = 0
                                for (let member of group.members) {
                                  if (!member.isPending) {
                                    numMembers += 1
                                  }
                                  if (!member.isPending && member.id == req.decoded.userId) {
                                    found = true
                                  }
                                }
                                if (!found || numMembers == 1) {
                                  newAnime.save(err => {
                                    if (err) {
                                      res.json({ success: false, message: err })
                                    } else {
                                      res.json({ success: true, message: 'Anime added to catalog!' })
                                    }
                                  })
                                } else {
                                  // Grab the relevant recommendations from the group members
                                  // Use all member names because we don't know who (if anyone) also has this anime
                                  let memberNames = []
                                  async.each(
                                    group.members,
                                    function getMemberName(member, done) {
                                      if (!member.isPending && member.id != req.decoded.userId) {
                                        User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                                          if (err) {
                                            done()
                                          } else if (!memberUser) {
                                            done()
                                          } else {
                                            memberNames.push(memberUser.username)
                                            done()
                                          }
                                        })
                                      } else {
                                        done()
                                      }
                                    },
                                    function allDone(err) {
                                      if (err) {
                                        res.json({ success: false, message: err })
                                      } else {
                                        Anime.findOne({ malID: newAnime.malID, user: { $in: memberNames } }, (err, memberAnime) => {
                                          if (err) {
                                            res.json({ success: false, message: err })
                                          } else if (!memberAnime) {
                                            newAnime.save(err => {
                                              if (err) {
                                                res.json({ success: false, message: err })
                                              } else {
                                                res.json({ success: true, message: 'Anime added to catalog!' })
                                              }
                                            })
                                          } else {
                                            if (memberAnime.recommenders) {
                                              newAnime.recommenders = memberAnime.recommenders
                                            }
                                            newAnime.save(err => {
                                              if (err) {
                                                res.json({ success: false, message: err })
                                              } else {
                                                res.json({ success: true, message: 'Anime added to catalog!' })
                                              }
                                            })
                                          }
                                        })
                                      }
                                    },
                                  )
                                }
                              }
                            })
                          }
                        }
                      })
                    }
                  }
                })
              }
            })
          }
        })
      })
      .close()
  })

  router.post('/changeFinalistStatus', (req, res) => {
    // Either add as finalist or remove finalist depending on newStatus
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        res.json({ success: false, message: 'User not found' })
      } else {
        Anime.findOneAndUpdate(
          { _id: ObjectID(req.body.id), user: user.username },
          { $set: { isFinalist: req.body.newStatus, comments: req.body.comments ? req.body.comments : [] } },
          (err, anime) => {
            if (err) {
              res.json({ success: false, message: err })
            } else if (!anime) {
              res.json({ success: false, message: 'Anime not found' })
            } else {
              res.json({ success: true, message: 'Finalist status changed!' })
            }
          },
        )
      }
    })
  })

  router.post('/changeNewSeasonStatus', (req, res) => {
    // Either add as finalist or remove finalist depending on newStatus
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        res.json({ success: false, message: 'User not found' })
      } else {
        Anime.findOneAndUpdate(
          { _id: ObjectID(req.body.id), user: user.username },
          { $set: { hasNewSeason: req.body.hasNewSeason } },
          (err, anime) => {
            if (err) {
              res.json({ success: false, message: err })
            } else if (!anime) {
              res.json({ success: false, message: 'Anime not found' })
            } else {
              res.json({ success: true, message: 'New Season status changed!' })
            }
          },
        )
      }
    })
  })

  router.post('/recommendAnime', (req, res) => {
    // First make sure username matches currently-logged-in-user
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        // prettier-ignore
        res.json({ success: false, message: 'User doesn\'t exist' })
      } else if (user.username != req.body.recommender) {
        res.json({ success: false, message: 'Invalid username' })
      } else {
        // Next check if user is in group--if not, we just update this anime
        if (!user.group) {
          Anime.update(
            { _id: ObjectID(req.body.anime._id) },
            { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } },
            err => {
              if (err) {
                res.json({ success: false, message: err })
              } else {
                res.json({ success: true, message: 'Anime recommended successfully!' })
              }
            },
          )
        } else {
          // Check if group is valid & user is in this group
          Group.findOne({ name: user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err })
            } else if (!group) {
              // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
              User.findOneAndUpdate({ _id: ObjectID(req.decoded.userId) }, { $set: { group: '' } }, err => {
                if (err) {
                  res.json({ success: false, message: err })
                } else {
                  Anime.update(
                    { _id: ObjectID(req.body.anime._id) },
                    { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } },
                    err => {
                      if (err) {
                        res.json({ success: false, message: err })
                      } else {
                        res.json({ success: true, message: 'Anime recommended successfully!' })
                      }
                    },
                  )
                }
              })
            } else {
              let found = false
              for (let member of group.members) {
                if (!member.isPending && member.id == req.decoded.userId) {
                  found = true
                }
              }
              if (!found) {
                Anime.update(
                  { _id: ObjectID(req.body.anime._id) },
                  { $set: { recommenders: [{ name: req.body.recommender }], ownerIsRecommender: true } },
                  err => {
                    if (err) {
                      res.json({ success: false, message: err })
                    } else {
                      res.json({ success: true, message: 'Anime recommended successfully!' })
                    }
                  },
                )
              } else {
                // Fetch names of group members
                let memberNames = []
                async.each(
                  group.members,
                  function getMemberName(member, done) {
                    if (!member.isPending) {
                      User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                        if (err) {
                          done()
                        } else if (!memberUser) {
                          done()
                        } else {
                          memberNames.push(memberUser.username)
                          done()
                        }
                      })
                    } else {
                      done()
                    }
                  },
                  function allDone(err) {
                    if (err) {
                      res.json({ success: false, message: err })
                    } else {
                      // HACK: To ensure they don't add themselves multiple times as recommenders by mashing the button or something we pull first as that doesn't fail
                      Anime.update(
                        { malID: req.body.anime.malID, user: { $in: memberNames } },
                        { $pull: { recommenders: { name: req.body.recommender } } },
                        { multi: true },
                        err => {
                          if (err) {
                            res.json({ success: false, message: err })
                          } else {
                            Anime.update(
                              { malID: req.body.anime.malID, user: { $in: memberNames } },
                              { $push: { recommenders: { name: req.body.recommender } } },
                              { multi: true },
                              err => {
                                if (err) {
                                  res.json({ success: false, message: err })
                                } else {
                                  Anime.update(
                                    { malID: req.body.anime.malID, user: req.body.recommender },
                                    { $set: { ownerIsRecommender: true } },
                                    err => {
                                      if (err) {
                                        res.json({ success: false, message: err })
                                      } else {
                                        res.json({ success: true, message: 'Anime recommended successfully!' })
                                      }
                                    },
                                  )
                                }
                              },
                            )
                          }
                        },
                      )
                    }
                  },
                )
              }
            }
          })
        }
      }
    })
  })

  router.post('/undoRecommendAnime', (req, res) => {
    // First make sure username matches currently-logged-in-user
    User.findOne({ _id: ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err })
      } else if (!user) {
        // prettier-ignore
        res.json({ success: false, message: 'User doesn\'t exist' })
      } else if (user.username != req.body.recommender) {
        res.json({ success: false, message: 'Invalid username' })
      } else {
        // Next check if user is in group--if not, we just update this anime
        if (!user.group) {
          Anime.update({ _id: ObjectID(req.body.anime._id) }, { $set: { recommenders: [], ownerIsRecommender: false } }, err => {
            if (err) {
              res.json({ success: false, message: err })
            } else {
              res.json({ success: true, message: 'Undo recommend was successful!' })
            }
          })
        } else {
          // Check if group is valid & user is in this group
          Group.findOne({ name: user.group }, (err, group) => {
            if (err) {
              res.json({ success: false, message: err })
            } else if (!group) {
              // Group doesn't exist anymore--delete relevant info from user document & continue with recommend
              User.findOneAndUpdate({ _id: ObjectID(req.decoded.userId) }, { $set: { group: '' } }, err => {
                if (err) {
                  res.json({ success: false, message: err })
                } else {
                  Anime.update({ _id: ObjectID(req.body.anime._id) }, { $set: { recommenders: [], ownerIsRecommender: false } }, err => {
                    if (err) {
                      res.json({ success: false, message: err })
                    } else {
                      res.json({ success: true, message: 'Undo recommend was successful!' })
                    }
                  })
                }
              })
            } else {
              let found = false
              for (let member of group.members) {
                if (!member.isPending && member.id == req.decoded.userId) {
                  found = true
                }
              }
              if (!found) {
                Anime.update({ _id: ObjectID(req.body.anime._id) }, { $set: { recommenders: [], ownerIsRecommender: false } }, err => {
                  if (err) {
                    res.json({ success: false, message: err })
                  } else {
                    res.json({ success: true, message: 'Anime recommended successfully!' })
                  }
                })
              } else {
                // Fetch names of group members
                let memberNames = []
                async.each(
                  group.members,
                  function getMemberName(member, done) {
                    if (!member.isPending) {
                      User.findOne({ _id: ObjectID(member.id) }, (err, memberUser) => {
                        if (err) {
                          done()
                        } else if (!memberUser) {
                          done()
                        } else {
                          memberNames.push(memberUser.username)
                          done()
                        }
                      })
                    } else {
                      done()
                    }
                  },
                  function allDone(err) {
                    if (err) {
                      res.json({ success: false, message: err })
                    } else {
                      Anime.update(
                        { malID: req.body.anime.malID, user: { $in: memberNames } },
                        { $pull: { recommenders: { name: req.body.recommender } } },
                        { multi: true },
                        err => {
                          if (err) {
                            res.json({ success: false, message: err })
                          } else {
                            Anime.update(
                              { malID: req.body.anime.malID, user: req.body.recommender },
                              { $set: { ownerIsRecommender: false } },
                              err => {
                                if (err) {
                                  res.json({ success: false, message: err })
                                } else {
                                  res.json({ success: true, message: 'Undo recommend successful!' })
                                }
                              },
                            )
                          }
                        },
                      )
                    }
                  },
                )
              }
            }
          })
        }
      }
    })
  })
  return router
}
