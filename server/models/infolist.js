const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const infolistSchema = new Schema({
  name: { type: String, required: true, unique: false, lowercase: false},
  user: { type: String, required: true, unique: false, lowercase: false},
  entries: [{ anime: String, info: String }],
  lastEditedDate: Date,
  linkedToCatalog: Boolean
});


module.exports = mongoose.model('TopTens', infolistSchema);
