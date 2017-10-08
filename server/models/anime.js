const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const animeSchema = new Schema({
  name: { type: String, required: true, unique: false, lowercase: false},
  description: String,
  rating: Number,
  thumbnail: String,
  malID: String,
  category: String,
  user: String,
  comments: [String],
  isFinalist: Boolean,
  genres: [String]
})

module.exports = mongoose.model('Anime', animeSchema);
