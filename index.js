const ipFilter = require('express-ipfilter').IpFilter;
const vsprintf = require("sprintf-js").vsprintf;
const bodyParser = require("body-parser");
const jsonfile = require('jsonfile');
const express = require("express");
const shortid = require("shortid");
const crypto = require('crypto');
const redis = require('redis');
const path = require('path');

var config = jsonfile.readFileSync(path.join(path.dirname(require.main.filename), 'config.json'));
var client = redis.createClient(); // this creates a new client
var app = express(); // create express app
var allowed = [];

if (config.api && config.api.allowedIps) {
  allowed = config.api.allowedIps; // only allow connections from config
} else {
  allowed = ["::ffff:0.0.0.0/0"]; // allow all connections
}

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

app.get("/api/getURL", ipFilter(allowed, { mode: 'allow' }), (req, res, next) => {
  if (crypto.createHash('md5').update(req.header('apiKey')).digest("hex") == "1ae80eea2d1fb4d5f4c60f511e6e180c") {
    getURLFromHash(req.body.hash, function (hash) {
      res.json({ "url": hash });
    });
  } else {
    res.status(403).send('Not allowed!');
  }
});

app.post("/api/setURL", ipFilter(allowed, { mode: 'allow' }), (req, res, next) => {
  if (crypto.createHash('md5').update(req.header('apiKey')).digest("hex") == "1ae80eea2d1fb4d5f4c60f511e6e180c") {
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
  } else {
    res.status(403).send('Not allowed!');
  }
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
  } else {
    res.status(500).send('Internal server error');
  }
});

// handle all possible errors
app.use(function (err, req, res, next) {
  console.error(err.stack);

  if (err.name == "IpDeniedError") {
    res.status(404).send('Resource does not exist');
  } else {
    res.status(500).send('Internal server error');
  }
});