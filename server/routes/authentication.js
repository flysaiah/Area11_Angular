const User = require('../models/user.js');
const jwt = require('jsonwebtoken');
const config = require('../config/database.js')
module.exports = (router) => {

  router.post('/register', (req, res) => {
    // TODO: Validation
    if (!req.body.username || !req.body.password) {
      res.json({ success: false, message: "Username/password not provided" });
    } else {
      let user = new User({
        username: req.body.username.toLowerCase(),
        password: req.body.password,
        bestgirl: req.body.bestgirl
      });
      user.save((err) => {
        if (err) {
          res.json({ success: false, message: "Could not save user. Error: ", err});
        } else {
          res.json({ success: true, message: "User successfully saved!"});
        }
      })
    }
  })

  router.post('/login', (req, res) => {
    // TODO: Validation
    User.findOne({ username: req.body.username.toLowerCase() }, (err, user) => {
      if (err) {
        res.json({ success: false, message: err });
      } else if (!user) {
          res.json({ success: false, message: "Username not found" });
      } else {
        if (user.comparePassword(req.body.password)) {
          // Password checks out
          const token = jwt.sign({ userId: user._id }, config.secret, { expiresIn: '24h' });
          res.json({ success: true, message: "Success", token: token, user: { username: user.username }});
        } else {
          res.json({ success: false, message: "Incorrect password" });
        }
      }
    })
  })

  // Any route that requires authentication goes after this middleware
  router.use((req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
      res.json({ success: false, message: "No token provided"})
    } else {
      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          res.json({ success: false, message: "Token invalid: " + err});
        } else {
          // can access this anywhere
          req.decoded = decoded;
          next();
        }
      })
    }
  });

  router.get('/profile', (req, res) => {
    console.log(req.decoded);
    console.log(req.decoded.userId)
    User.findOne({ _id: req.decoded.userId }).select('username').exec((err, user) => {
      if (err) {
        res.json({ success: false, message: err});
      } else if (!user) {
        res.json({ success: false, message: 'No user found' })
      } else {
        res.json({ success: true, user: user})
      }
    });
  })


  return router;
}
