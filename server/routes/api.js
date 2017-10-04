const express = require('express');
const router = express.Router();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

// Connect
const connection = (closure) => {
  return MongoClient.connect('mongodb://localhost:27017/area11', (err, db) => {
    if (err) return console.log(err);

    closure(db);
  });
};

// Error handling
const sendError = (err, res) => {
  response.status = 501;
  response.message = typeof err == 'object' ? err.message : err;
  res.status(501).json(response);
};

// Response handling
let response = {
  status: 200,
  data: [],
  message: null
};

router.post('/removeAnimeFromCatalog', (req, res) => {
  connection((db) => {
    db.collection('anime')
    .remove({'_id': ObjectID(req["body"]["id"])}, 1)
    .then((dummy) => {
      res.json({wasSuccessful: true});
    })
    .catch((err) => {
      sendError(err, res);
    });
  })
});

router.post('/changeCategory', (req, res) => {
  const id = ObjectID(req["body"]["id"]);
  const newCategory = req["body"]["category"];
  connection((db) => {
    db.collection('anime')
    .update({'_id': id}, {$set: {'category': newCategory}})
    .then((dummy) => {
      res.json({wasSuccessful: true})
    })
    .catch((err) => {
      sendError(err, res);
    })
  })
});

router.get('/fetchAnime', (req, res) => {
  connection((db) => {
    db.collection('anime')
    .find({'category': 'Want to Watch'})
    .toArray()
    .then((wwAnime) => {
      db.collection('anime')
      .find({'category': 'Considering'})
      .toArray().then((cAnime) => {
        db.collection('anime')
        .find({'category': 'Completed'})
        .toArray()
        .then((compAnime) => {
          response.data = {'wwAnime': wwAnime, 'cAnime': cAnime, 'compAnime': compAnime};
          res.json(response);
        }).catch((err) => {
          sendError(err, res);
        })
      })
      .catch((err) => {
        sendError(err, res);
      });
    }).catch((err) => {
      sendError(err, res);
    });
  });
});

router.post('/malSearch', (req, res) => {
  const query = encodeURIComponent(req["body"]["query"]);
  const parser = require('xml2json');
  const request = require('request');
  request.get({url: 'https://area11-burn:yuibestgirl4ever@myanimelist.net/api/anime/search.xml?q=' + query}, function (error, response, body) {
    if (!error) {
      let jsonString = parser.toJson(body);
      res.json(jsonString)
    } else {
      if (error.toString() == "Error: Parse Error") {
        res.json({hasFailed: true, reason: "noResults"})
        return;   // We need this because of a weird error that happens in express due to the way errors are handled
      }
      res.json({hasFailed: true, reason: "unkown"})
    }
  });
});

router.post('/addAnimeToCatalog', (req, res) => {
  // TODO: Validation to make sure that we don't insert the same anime into our DB twice (probably filter by name)
  const anime = req['body']['anime']
  const cat = req['body']['category']
  connection((db) => {
    db.collection('anime')
    .insert({name: anime['name'], description: anime['description'], rating: anime['rating'], thumbnail: anime['thumbnail'], malID: anime['malID'], category: cat})
    .then((dummy) => {
      res.json({wasSuccessful: true})
    })
    .catch((err) => {
      sendError(err, res);
    });
  });
});


module.exports = router;
