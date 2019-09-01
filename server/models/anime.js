const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const animeSchema = new Schema({
  name: { type: String, required: true, unique: false, lowercase: false},
  description: String,
  rating: Number,
  thumbnail: String,
  malID: String,   // myanimelist ID
  category: String,
  user: String,   // username, not ID
  comments: [String],
  isFinalist: Boolean,
  genres: [String],
  startDate: String,
  endDate: String,
  type: String,
  englishTitle: String,
  status: String,
  recommenders: [{ name: String }],
  ownerIsRecommender: Boolean,
  hasNewSeason: Boolean,
  runtime: String,
  studios: String,
  ranking: Number,
  popularity: Number
});

module.exports = mongoose.model('Anime', animeSchema);
