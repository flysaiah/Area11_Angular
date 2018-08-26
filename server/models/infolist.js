const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const Schema = mongoose.Schema
const infolistSchema = new Schema({
  name: { type: String, required: true, unique: false, lowercase: false },
  user: { type: String, required: true, unique: false, lowercase: false },
  entries: [{ anime: String, info: String }],
  lastEditedDate: Date,
})

module.exports = mongoose.model('Infolist', infolistSchema)
