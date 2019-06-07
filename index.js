const bodyParser = require("body-parser");
const express = require("express");
const shortid = require("shortid");
const config = require('./config.json');
const redis = require('redis');

var client = redis.createClient(); // this creates a new client
var app = express(); // create express app

// use the json parser for body
app.use(bodyParser.json());

// start listener
app.listen(config.server.port, () => {
  console.log("Server running on port 3000");
});

client.on('error', function (err) {
  // do something on error
});

function getURLFromHash(hash, callback) {
  if (shortid.isValid(hash)) {
    client.get(hash, function (err, dbres) {
      callback(dbres);
    });
  } else {
    callback(null);
  }
}


function generateNewShortId(counter, callback) {
  var uuid = shortid.generate();

  client.get(uuid, function (err, dbres) {
    if (dbres) {
      if (counter < 5) {
        generateNewShortId(counter + 1, callback);
      } else {
        callback(null);
      }
    } else {
      callback(uuid);
    }
  });
}

app.get("/api/getURL", (req, res, next) => {
  getURLFromHash(req.body.hash, function (hash) {
    res.json({ "url": hash });
  });
});

app.post("/api/setURL", (req, res, next) => {
  generateNewShortId(1, function (uuid) {
    if (uuid) {
      client.set(uuid, req.body.url, function (err, dbres) {
        if (dbres) {
          if (req.body.expire) {
            client.expire(uuid, req.body.expire);
          }

          res.json({ "url": "http://" + req.get('host') + config.server.port + "/" + uuid });
        }
      });
    } else {
      res.status(500);
    }
  });
});

// server the redirect request
app.use(function (req, res) {
  if (req.url) {
    getURLFromHash(req.url.substring(1), function (hash) {
      if (hash) {
        res.redirect(hash);
      } else {
        res.status(404).send('Not found');
      }
    });
  }
});