
var spawn = require('child_process').spawn;
var config = require('./../../config');

exports.getlist = function(req, res, next) {

    var temp = [{
        title: "Cool Routine",
        description: "Transforms the data from boring data to fashionable data",
        markable: [
            'dataset',
            'event'
        ],
        requiresdata: true,
        operatinglimit: 1,
        id: '897a8884-b53e-4ec2-8c9a-885ccb95eef1'
    }];

    res.json(temp);

};

exports.getusrform = function(req, res, next) {

    var temp = {
        "schema": {
            "start_time": {
                "type": "object",
                "title": "Start Time",
                "properties": {
                    "selected": {
                        "type": "checkbox",
                        "title": "Apply Start Time"
                    },
                    "date": {
                        "type": "date",
                        "title": "Date"
                    },
                    "hour": {
                        "type": "integer",
                        "title": "hour",
                        "minimum": 1,
                        "maximum": 23,
                        "default": 1
                    },
                    "minute": {
                        "type": "integer",
                        "title": "minute",
                        "minimum": 0,
                        "maximum": 59,
                        "default": 2
                    },
                    "second": {
                        "type": "number",
                        "title": "second",
                        "minimum": 0,
                        "maximum": 59.999,
                        "default": 3.456
                    }
                }
            },
            "end_time": {
                "type": "object",
                "title": "End Time",
                "properties": {
                    "selected": {
                        "type": "checkbox",
                        "title": "Apply End Time"
                    },
                    "date": {
                        "type": "date",
                        "title": "Date"
                    },
                    "hour": {
                        "type": "integer",
                        "title": "hour",
                        "minimum": 1,
                        "maximum": 23,
                        "default": 1
                    },
                    "minute": {
                        "type": "integer",
                        "title": "minute",
                        "minimum": 0,
                        "maximum": 59,
                        "default": 2
                    },
                    "second": {
                        "type": "number",
                        "title": "second",
                        "minimum": 0,
                        "maximum": 59.999,
                        "default": 3.456
                    }
                }
            }
        },
        "form": [
            {
                "type": "help",
                "helpvalue": "Specify the start time and/or the end time of the dataset. If only one is specified then the dataset is shifted. If both are specified then the dataset is both shifted and stretched (or compressed)."
            },
            "start_time",
            "end_time"
        ]
    };

    res.json(temp);

};

exports.operateusr = function(req, res, next) {
    console.log("Got post request: " + JSON.stringify(req.body));

    var form = req.body["form"];
    var marked = req.body["marked"];
    var id = req.body["id"];

    //TODO(SRLM): Add a check here to validate the variables from the user.



    var reply = {};
    //res.json(reply);
    res.json(JSON.parse('["Hello, World"]'));
};