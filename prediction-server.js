var express = require("express");
var bodyParser = require("body-parser");
var uuid = require("node-uuid");
var Redis = require("redis");
var async = require("async");
var stats = require("./stats");
var arrayConverter = require("./array-object-converter");
var Promise = require("promise");
var TITLE_REQUIRED = "Items in todo list must have a title in the body";

module.exports = getServer;

var MALE_RANGE = "bmi_range:male";
var FEMALE_RANGE = "bmi_range:female";
var SCORED = "scored:";

function getServer(config, scripts) {

    var rclient = Redis.createClient(config);
    var app = express()
        .post("/*", bodyParser.json())
        .post("/guess", getPrediction)
        .post("/data", addDataPoint);
        
    return app;

    function addDataPoint(req, res, next) {

        var bmi = getBMI(req.body.weight, req.body.height);
        var key = new Boolean(req.body.male) == true ? MALE_RANGE : FEMALE_RANGE;
        rclient.multi()
            .lpush(key, bmi)
            .zincrby(SCORED.concat(key), 1, bmi)
            .lrange(MALE_RANGE, 0, -1)
            .lrange(FEMALE_RANGE, 0, -1)
            .exec(processResults);

        function processResults(err, results) {

            if (err) return res.json(err).end();
            else return res.json({
                "success": results[0],
                "male_range": results[2],
                "female_range": results[3]
            }).end();
        }
    }

    function getPrediction(req, res, next) {

        var bmi = getBMI(req.body.weight, req.body.height);

        rclient.multi()
            .sort(MALE_RANGE)
            .sort(FEMALE_RANGE)
            .lrange(MALE_RANGE, 0, -1)
            .lrange(FEMALE_RANGE, 0, -1)
            .exec(function(err, results) {

                if (err) res.json(err).end();
                else determineGender(results[0], results[1], bmi)
                    .then(function(gender) {
                        res.end(gender);
                    });
            });

        function determineGender(males, females, bmi) {

            return new Promise(function(resolve, reject) {

                //could use async sequence for this one!!
                var male_mean = stats.mean(males);
                var female_mean = stats.mean(females);
                var male_variance = stats.variance(male_mean, males);
                var female_variance = stats.variance(female_mean, males);
                var male_sdeviation = stats.sdeviation(male_variance);
                var female_sdeviation = stats.sdeviation(female_variance);
                var male_prob = stats.probability(Math.abs(bmi - male_mean), male_sdeviation);
                var female_prob = stats.probability(Math.abs(bmi - female_mean), female_sdeviation);
                if (male_prob > female_prob) resolve("male");
                else resolve("female");
            });
        }

        function sendPrediction(err, result) {

            if (err) res.json(err).end();
            else res.json(result);
        }
    }

    function getBMI(weight, height) {
        return (weight / Math.pow(height, 2)) * 703;
    }
}
