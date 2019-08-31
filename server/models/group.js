const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const groupSchema = new Schema({
  name: { type: String, required: true, unique: true, lowercase: false},
  members: { type: [{ id: String, isPending: Boolean }], required: true, unique: false, lowercase: false},
  countdown: { name: String, date: Date }
});


module.exports = mongoose.model('Group', groupSchema);
