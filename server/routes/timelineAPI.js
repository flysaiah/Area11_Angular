const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Timeline = require('../models/timeline.js');

module.exports = (router) => {

  router.post('/createTimeline', (req, res) => {
    let newTimeline = new Timeline({
      user: req.decoded.userId,
      eras: [{
        name: "First Era",
        startDate: "April 1850",
        entries: ["List your anime here!"]
      }]
    });

    newTimeline.save((err) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: 'New timeline created!' });
      }
    });
  });

  router.post('/saveTimeline', (req, res) => {
    // Save state of timeline (currently only possible after editing 1 era at a time)
    Timeline.findOneAndUpdate({ "user": ObjectID(req.decoded.userId) }, { $set: { eras: req.body.eras } }, (err, timeline) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!timeline) {
        res.json({ success: false, message: "Timeline not found" });
      } else {
        res.json({ success: true, message: "Timeline updated successfully!" });
      }
    });
  });

  router.post('/addAnimeToTimeline', (req, res) => {
    // Add anime to timeline in specified era index; if -1 is given for index then add to most recent era
    Timeline.findOne({ "user": ObjectID(req.decoded.userId) }, (err, timeline) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!timeline) {
        res.json({ success: false, message: "Timeline not found" });
      } else {
        if (!timeline.eras.length) {
          res.json({ success: false, message: "Timeline not found" });
        } else {
          let chosenEraIndex = timeline.eras.length - 1
          if (req.body.index != -1) {
            if (req.body.index > timeline.eras.length - 1) {
              res.json({ success: false, message: "Invalid index" });
            } else {
              chosenEraIndex = req.body.index;
            }
          }
          let newEras = timeline.eras;
          if (!newEras[chosenEraIndex].entries) {
            newEras[chosenEraIndex].entries = [];
          }
          newEras[chosenEraIndex].entries.push(req.body.name);
          Timeline.findOneAndUpdate({ "user": ObjectID(req.decoded.userId) }, { $set: { eras: newEras } }, (err, timeline) => {
            if (err) {
              res.json({ success: false, message: err });
            } else if (!timeline) {
              res.json({ success: false, message: "Timeline not found" });
            } else {
              res.json({ success: true, message: "Timeline updated successfully!" });
            }
          });
        }
      }
    });
  });

  router.post('/fetchTimeline', (req, res) => {
    Timeline.findOne({ "user": ObjectID(req.decoded.userId) }, (err, timeline) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!timeline) {
        res.json({ success: true });
      } else {
        res.json({ success: true, timeline: timeline });
      }
    });
  });

  return router;
}
