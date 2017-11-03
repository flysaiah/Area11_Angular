// Contains all API hooks except those used for authentication
const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID;
const User = require('../models/user.js');
const Group = require('../models/group.js');
const TopTens = require('../models/toptens.js');

module.exports = (router) => {

  // Validation to make sure user is who he/she claims to be and is a member of the group
  router.use((req, res, next) => {
    User.findOne({ "_id": ObjectID(req.decoded.userId) }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!user) {
        res.json({ success: false, message: "User not found" });
      } else {
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
              // Everything is fine
              // Store username
              req.currentUsername = user.username;
              next();
            }
          }
        });
      }
    });
  });

  router.post('/addNewCategory', (req, res) => {
    // First make sure category doesn't already exist
    TopTens.findOne({ group: req.body.groupName, category: req.body.newCategory }, (err, toptens) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (toptens) {
        res.json({ success: false, message: "Category already exists" });
      } else {
        let newTopTens = new TopTens({
          group: req.body.groupName,
          category: req.body.newCategory,
          hasNoContent: true
        });
        newTopTens.save((err) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.json({ success: true, message: 'New category added!' });
          }
        });
      }
    });
  });

  router.post('/getTopTensInfo', (req, res) => {
    TopTens.find({ group: req.body.groupName, hasNoContent: true}, (err, allCategories) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        TopTens.find({ group: req.body.groupName }, (err, allTopTens) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.json({ success: true, allCategories: allCategories, allTopTens: allTopTens });
          }
        });
      }
    });
  });

  router.post('/saveChanges', (req, res) => {
    let newTT = new TopTens(req.body.toptensObj);
    TopTens.findOneAndUpdate({ category: newTT.category, group: newTT.group, user: newTT.user }, newTT, { upsert: true}, (err, tt) => {
      if (err) {
        res.json({ success: false, message: err });
      } else {
        res.json({ success: true, message: "Saved changes successfully!" });
      }
    })
  });

  router.post('/deleteCategory', (req, res) => {
    TopTens.find({ "category": req.body.category, "group": req.body.groupName }).remove().exec();
    res.json({ success: true, message: "Category deleted!" });
  });
  return router;
}
