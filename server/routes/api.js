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
//
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

router.get('/fetchAnime', (req, res) => {
    connection((db) => {
        db.collection('anime')
            .find({'category': 'Want to Watch'})
            .toArray()
            .then((wwAnime) => {
                db.collection('anime')
                .find({'category': 'Considering'})
                .toArray()
                .then((cAnime) => {
                  response.data = {'wwAnime': wwAnime, 'cAnime': cAnime};
                  res.json(response);
                }).catch((err) => {
                  sendError(err, res);
                })
            })
            .catch((err) => {
                sendError(err, res);
            });
    });
});
module.exports = router;
