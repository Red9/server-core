var spawn = require('child_process').spawn;
var fs = require('fs');
var underscore = require('underscore');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var common = requireFromRoot('support/resourcescommon');

/**
 * @warning: If you move this file to a new directory you must update the
 * 'require' statement below in the body of the code!
 * 
 * @type type
 */

var usrList = [];

var processUsr = function(usrDirectory) {
    fs.exists(usrDirectory + '/package.json', function(exists) {
        if (exists) {
            // fs operates relative to where the program is executed, while
            // require operates relative to where this particular file is.
            // Annoying!
            var package = require('../../' + usrDirectory + '/package.json');
            package.directory = usrDirectory;
            package.id = common.generateUUID();
            log.debug('Got USR: ' + package.id);
            usrList.push(package);
        }
    });
};


function GetUsrFromList(id) {
    return underscore.find(usrList, function(t) {
        return t.id === id;
    });
}

function GetCommonUSRParameters() {
    var parameters = [];
    parameters.push('--apiDomain');
    parameters.push(config.apiRealm);
    return parameters;
}

exports.getForm = function(id, marked, callback) {
    var usr = GetUsrFromList(id);

    if (usr) {
        var formExecutable = process.cwd() + '/' + usr.directory + '/' + usr.executables.form;
        var parameters = GetCommonUSRParameters();

        var options = {
            cwd: process.cwd() + '/' + usr.directory,
            env: process.env
        };
        var runningUsr = spawn(formExecutable, parameters, options);
        runningUsr.stdout.setEncoding('utf8');
        runningUsr.stderr.setEncoding('utf8');

        runningUsr.stdin.setEncoding('utf8');

        runningUsr.stdin.on('error', function() {
            // process exited before we could write to stdin.
        });
        runningUsr.stdin.write(JSON.stringify(marked) + '\n');

        runningUsr.on('exit', function(code, signal) {
            //TODO(SRLM): Add a catch in case the USR doesn't return a JSON structure
            var form = JSON.parse(runningUsr.stdout.read());

            log.debug('USR errors: "' + runningUsr.stderr.read() + '"');
            callback(undefined, form);
        });


    } else {
        log.debug("Couldn't find matching usr...");
        callback("couldn't find matching usr");
    }

};


exports.loadUsrs = function() {
    var usrDirectory = config.usrDirectory;

    log.debug('USR Directory: ' + usrDirectory);
    fs.readdir(usrDirectory + '/', function(err, files) {
        underscore.each(files, function(folder, index) {
            fs.stat(usrDirectory + '/' + folder, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    processUsr(usrDirectory + '/' + folder);
                }
            });

        });
    });
};


exports.getUsrs = function(callback) {
    callback(usrList);
};


exports.operateUsr = function(id, usrForm, callback) {
    var usr = GetUsrFromList(id);
    if (usr) {
        var usrExecutable = process.cwd() + '/' + usr.directory + '/' + usr.executables.execute;
        var parameters = GetCommonUSRParameters();

        var options = {
            cwd: process.cwd() + '/' + usr.directory,
            env: process.env
        };
        var runningUsr = spawn(usrExecutable, parameters, options);
        runningUsr.stdout.setEncoding('utf8');
        runningUsr.stderr.setEncoding('utf8');

        runningUsr.stdin.setEncoding('utf8');

        //TODO(SRLM): Add catch in case the USR throws an error

        runningUsr.stdin.on('error', function(err) {
            // process exited before we could write to stdin.
            log.error('Operate USR Error: ' + err);

        });
        runningUsr.stdin.write(JSON.stringify(usrForm) + '\n');

        runningUsr.on('exit', function(code, signal) {
            //TODO(SRLM): Add a catch in case the USR doesn't return a JSON structure
            var result = JSON.parse(runningUsr.stdout.read());

            log.debug('USR errors: "' + runningUsr.stderr.read() + '"');
            callback(undefined, result);
        });

    } else {
        callback('USR ' + id + ' not found');
    }
};

