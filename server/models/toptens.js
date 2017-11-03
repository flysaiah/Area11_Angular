const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const toptensSchema = new Schema({
  group: { type: String, required: true, unique: false, lowercase: false},
  category: { type: String, required: true, unique: false, lowercase: false},
  user: String,
  entries: [{ name: String, viewerPrefs: [{ member: String, shouldHide: Boolean }] }],
  hasNoContent: Boolean
});


module.exports = mongoose.model('TopTens', toptensSchema);
