const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Anime = require('../models/anime.js');
const Timeline = require('../models/timeline.js');
const User = require('../models/user.js');
const async = require('async');

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

    // Update recommenations if user is in a group
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

  router.post('/fetchTimeline', (req, res) => {
    // Save state of timeline (currently only possible after editing 1 era at a time)
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
