const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const timelineSchema = new Schema({
  user: String,
  eras: [{ name: String, entries: [String], startDate: String, endDate: String, location: String, metadata: String, subHeader: String, backgroundColor: String }],
});

module.exports = mongoose.model('Timeline', timelineSchema);
