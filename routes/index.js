var express = require('express');
var router = express.Router();
var pg = require('pg');
var moment = require('moment');
var geolib = require('geolib');
var url = require('url');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/zfriss';

var PAGE_SIZE = 48;

router.get('/', function(req, res, next) {
  res.send();
});

router.get('/api/v1/pictures', function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    var results = [];

    var page = parseInt(req.query.page, 10);

    if (!page || isNaN(page)) {
      page = 0;
    }

    var offset = page * PAGE_SIZE;

    pg.connect(connectionString, function(err, client, done) {

        queryString = "SELECT * FROM instagram_Items ORDER BY created_time DESC OFFSET " + offset + " LIMIT " + PAGE_SIZE + ";";
        var query = client.query(queryString);

        query.on('row', function(row) {
          row.full_data = JSON.parse(row.full_data)
            results.push(row);
        });

        query.on('end', function() {
            client.end();
            return res.json(results);
        });

        if(err) {
          console.log(err);
        }

    });

});

router.post('/api/v1/pictures', function(req, res) {

    var results = [];

    var metaData = req.body;

    var distance = geolib.getDistance(
      {latitude: 43.0839453, longitude: -77.6746385},
      {latitude: metaData.location.latitude, longitude: metaData.location.longitude}
    );

    // Grab data from http request
    var data = {
      full_data: JSON.stringify(metaData),
      instagram_id: metaData.id,
      created_time: moment(metaData.created_time * 1000).format(),
      username: metaData.user.username,
      user_id: metaData.user.id,
      link: metaData.link,
      path: url.parse(metaData.link).pathname,
      latitude: metaData.location.latitude,
      longitude: metaData.location.longitude,
      instagram_type: metaData.type,
      filter: metaData.filter,
      distance_from_center_in_meters: distance
    };

    pg.connect(connectionString, function(err, client, done) {

        queryString = "SELECT instagram_id FROM instagram_items WHERE instagram_id = '" + data.instagram_id + "';";
        var query = client.query(queryString);

        query.on('end', function(result) {
            if (result.rowCount === 0){
              var insertQuery = client.query("INSERT INTO instagram_items(full_data, instagram_id, created_time, username, user_id, link, path, latitude, longitude, instagram_type, filter, distance_from_center_in_meters, created_at, updated_at) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
                [data.full_data, data.instagram_id, data.created_time, data.username, data.user_id, data.link, data.path, data.latitude, data.longitude, data.instagram_type, data.filter, data.distance_from_center_in_meters, moment().format(), moment().format()]);

              insertQuery.on('end', function() {
                client.end();
                return res.json(data);
              });

            } else {
              var errorMsg = {error: "Instagram ID: " + data.instagram_id + " Already exists."};
              console.log(errorMsg)
              client.end();

              return res.status(403).json(errorMsg);
            }
        });

        if(err) {
          console.log(err);
        }

    });
});

module.exports = router;
