const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const app = express();
const router = express.Router();
const authentication = require('./server/routes/authentication')(router);
const config = require('./server/config/database.js')
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect(config.uri, {useMongoClient: true}, (err) => {
  if (err) {
    console.log('Could not connect to database: ', err);
  } else {
    console.log('Connected to database: ' + config.db);
  }
})

// API file for interacting with MongoDB
const api = require('./server/routes/api');

// Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));

// Angular DIST output folder
app.use(express.static(path.join(__dirname, 'dist')));

// API location
app.use('/api', api);

// Authentication
app.use('/authentication', authentication);

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

//Set Port
const port = process.env.PORT || '3000';
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => console.log(`Running on localhost:${port}`));
