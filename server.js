const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const app = express();
const router = express.Router();
const config = require('./server/config/database.js')
const mongoose = require('mongoose');

app.use(express.static(path.join(__dirname, 'public')));

mongoose.Promise = global.Promise;

mongoose.connect(config.uri, {useMongoClient: true}, (err) => {
  if (err) {
    console.log('Could not connect to database: ', err);
  } else {
    console.log('Connected to database: ' + config.db);
  }
});

// API files for interacting with MongoDB
const authentication = require('./server/routes/authentication')(router);
const animeAPI = require('./server/routes/animeAPI')(router);
const userAPI = require('./server/routes/userAPI')(router);
const infolistAPI = require('./server/routes/infolistAPI')(router);
const timelineAPI = require('./server/routes/timelineAPI')(router);
const groupAPI = require('./server/routes/groupAPI')(router);
const toptensAPI = require('./server/routes/toptensAPI')(router);


// Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));

// Angular DIST output folder
app.use(express.static(path.join(__dirname, 'dist')));

// Authentication
app.use('/authentication', authentication);

// API locations
app.use('/api/anime', animeAPI);
app.use('/api/user', userAPI);
app.use('/api/timeline', timelineAPI);
app.use('/api/infolist', infolistAPI)
app.use('/api/group', groupAPI);
app.use('/api/toptens', toptensAPI);

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

//Set Port
const port = process.env.PORT || '3000';
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => console.log(`Running on localhost:${port}`));
