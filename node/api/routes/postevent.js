var database = require('./../support/database');
var externals = require('./../support/externals');
var spawn = require('child_process').spawn;
var config = require('./../config');
var log = require('./../support/logger').log;



exports.post = function(req, res, next) {
    //console.log("Post result: " + JSON.stringify(req.body));
    //console.log("Post result, straight: '" + req.body + "'");
    //console.log("Post result: '%j'", req.body);


    var parameters = req.body.parameters;
    if (typeof parameters === "undefined") {
        parameters = {};
    }

    var event = {};

    event["id"] = {hint: "uuid", value: database.GenerateUUID()};
    // dataset
    event["start_time"] = new Date(parseFloat(req.body.start_time));
    event["end_time"] = new Date(parseFloat(req.body.end_time));
    event["confidence"] = {hint: "int", value: req.body.confidence};
    event["parent"] = {hint: "uuid", value: req.body.parent};
    event["children"] = {hint: "list", value: []};
    event["type"] = req.body.type;
    event["parameters"] = {hint: "map", value: parameters};
    event["source"] = req.body.source;
    event["create_time"] = new Date(Date.now());
    event["summary_statistics"] = "";

    //console.log("req.body.start_time: '" + req.body.start_time + "'");
    //console.log("req.body.parent: '" + req.body.parent + "'");

    database.GetRow("event", "id", event["parent"], function(parent) {
        if (typeof parent === "undefined") {
            // error
        } else {
            event["dataset"] = parent["dataset"];

            database.InsertRow("event", event, function(err) {
                if (err) {
                    res.json({});
                } else {
                    //TODO(SRLM): Add event to children of parent.
                    database.UpdateRowModifyList("event", "id", event["parent"], "children", event["id"], "add", function(err) {
                        if (err) {
                            res.send(500, 'Something broke: ' + err);
                        } else {
                            event = database.StripHintsFromJSON(event);

                            res.json(event);
                        }

                    });
                    // It was successfully entered, so let's calculate some statistics.
                    externals.BeginStatisticsCalculation(event['id'].value);

                }
            });
        }
    });




};