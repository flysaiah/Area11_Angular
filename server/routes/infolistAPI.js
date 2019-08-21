const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const Infolist = require('../models/infolist.js')
const User = require("../models/user.js");

module.exports = (router) => {

  router.post('/addNewInfolist', (req, res) => {
    let newInfolist = new Infolist({
      name: req.body.infolist.name,
      user: req.decoded.userId,
      entries: req.body.infolist.entries,
      lastEditedDate: new Date()
    });

    newInfolist.save((err) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, infolist: newInfolist, message: 'New infolist created!' });
      }
    });
  });

  router.post('/saveInfolist', (req, res) => {
    // Save state of infolist
    // Name is updated separately--if new name is present then don't update anything else
    let newInfolist;
    if (req.body.newName) {
      newInfolist = {
        name: req.body.newName
      }
    } else {
      newInfolist = {
        entries: req.body.infolist.entries,
        lastEditedDate: new Date()
      }
    }

    Infolist.findOneAndUpdate({ "user": ObjectID(req.decoded.userId), "name": req.body.infolist.name }, { $set: newInfolist }, { new: true }, (err, infolist) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!infolist) {
        res.json({ success: false, message: "Infolist not found" });
      } else {
        res.json({ success: true, infolist: infolist, message: "Infolist updated successfully!" });
      }
    });
  });

  router.post('/fetchInfolists', (req, res) => {
    Infolist.find({ "user": ObjectID(req.decoded.userId) }, (err, infolists) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!infolists) {
        res.json({ success: true });
      } else {
        res.json({ success: true, infolists: infolists });
      }
    });
  });

  router.post('/deleteInfolist', (req, res) => {
    Infolist.findOne({ "user": ObjectID(req.decoded.userId), "name": req.body.infolist.name }).remove().exec();
    res.json({ success: true })
  });

  return router;
}
