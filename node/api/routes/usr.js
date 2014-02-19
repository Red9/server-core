
var spawn = require('child_process').spawn;
var config = require('./../../config');

var underscore = require('underscore');

var usrResource = require('./../../support/resources/resource/usr_resource');
var validator = require('validator');


exports.get = function(req, res, next) {
    usrResource.getUsrs(function(list) {
        console.log('usr list: ' + JSON.stringify(list));
        res.json(list);
    });
};

exports.getusrform = function(req, res, next) {

    // Validate parameters



    var marked = {
    };

    var markableTypes = [
        'datasets',
        'events'
    ];

    var validParameters = true;

    underscore.each(markableTypes, function(type) {
        if (typeof req.param(type) !== 'undefined') {
            var temp = req.param(type).split(',');
            marked[type] = [];
            underscore.each(temp, function(id) {
                console.log('Testing ' + id);
                if (validator.isUUID(id) === false) {
                    console.log('Not valid id');
                    validParameters = false;
                } else {
                    marked[type].push(id);
                }
            });
        }
    });

    if (validParameters === false) {
        res.status(400).json({message:'Parameters must be valid IDs'});
        return;
    }

    usrResource.getForm(req.param('id'), marked, function(err, form) {
        if (err) {
            next();
        } else {
            res.json(form);
        }
    });


    /*  var temp = {
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
     */
};

exports.operateusr = function(req, res, next) {
    console.log("Got post request: " + JSON.stringify(req.body));

    var form = req.body["form"];
    var marked = req.body["marked"];

    //TODO(SRLM): Add a check here to validate the variables from the user.

    var parameters = {
        form: form,
        marked: marked
    };
    
    usrResource.operateUsr(req.param('id'), parameters, function(err, response){
        if(err){
            res.status(400).json({message:err});
        }else{
            console.log(response);
            res.json({message:'Success'});
        }
    });
};