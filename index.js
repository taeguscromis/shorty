const ipFilter = require('express-ipfilter').IpFilter;
const vsprintf = require("sprintf-js").vsprintf;
const bodyParser = require("body-parser");
const express = require("express");
const shortid = require("shortid");
const config = require('./config.json');
const redis = require('redis');

var client = redis.createClient(); // this creates a new client
var allowed = ['192.168.0.0/16']; // only allow LAN connections
var app = express(); // create express app

// use the json parser for body
app.use(bodyParser.json());

// start listener
app.listen(config.server.port, () => {
  console.log(vsprintf("Server running on port %s", [config.server.port.toString()]));
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

          res.json({ "url": vsprintf("http://%s/%s", [req.get('host'), uuid]) });
        }
      });
    } else {
      res.status(500);
    }
  });
});

// server the redirect request
app.use(ipFilter(allowed, { mode: 'allow' }), function (req, res) {
  if (req.url) {
    getURLFromHash(req.url.substring(1), function (hash) {
      if (hash) {
        res.redirect(hash);
      } else {
        res.status(404).send('Not found');
      }
    });
  } else {
    res.status(500).send('Internal server error!');
  }
});

// handle all possible errors
app.use(function (err, req, res, next) {
  console.error(err.stack);

  if (err.name == "IpDeniedError") {
    res.status(403).send('You shall not pass!')
  } else {
    res.status(500).send('Internal server error!');
  }
});