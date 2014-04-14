var underscore = require('underscore');
var validator = require('validator');
var spawn = require('child_process').spawn;

var config = requireFromRoot('config');
var log = requireFromRoot('support/logger').log;
var usrResource = requireFromRoot('support/resources/usr');

exports.get = function(req, res, next) {
    usrResource.getUsrs(function(list) {
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
                if (validator.isUUID(id) === false) {
                    log.debug('Not valid resource id: ' + id);
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
};

exports.operateusr = function(req, res, next) {
    var form = req.body["form"];
    var marked = req.body["marked"];

    var parameters = {
        form: form,
        marked: marked
    };
    
    usrResource.operateUsr(req.param('id'), parameters, function(err, response){
        if(err){
            res.status(400).json({message:err});
        }else{
            log.debug('USR response: ' + response);
            res.json({message:'Success'});
        }
    });
};