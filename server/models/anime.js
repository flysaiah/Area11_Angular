const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const animeSchema = new Schema({
  name: { type: String, required: true, unique: false, lowercase: false},
  description: String,
  rating: { type: Number, required: true, unique: false, lowercase: false},
  thumbnail: { type: String, required: true, unique: false, lowercase: false},
  malID: { type: String, required: true, unique: false, lowercase: false},
  comments: { type: [String], required: false, unique: false, lowercase: false},
  category: { type: String, required: true, unique: false, lowercase: false},
  user: { type: String, required: false, unique: false, lowercase: true},

})

module.exports = mongoose.model('Anime', animeSchema);
