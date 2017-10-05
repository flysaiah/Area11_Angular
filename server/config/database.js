const crypto = require('crypto').randomBytes(256).toString('hex');

module.exports = {
  uri: 'mongodb://localhost:27017/area11',
  secret: 'crypto',
  db: 'area11'
}
