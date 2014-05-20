/**
 * Based on the Node.js Connect logger 
 *
 */

var underscore = require('underscore')._;
var moment = require('moment');

var bytes = require('bytes');

var winston = require('winston');
var Loggly = require('winston-loggly').Loggly;
var Papertrail = require('winston-papertrail').Papertrail;

var config = requireFromRoot('config');


var log_color = {};
var log_standard = {};
var log_json = {};

var instanceType = '';
var instanceId = '';

exports.init = function(newInstanceType, newInstanceId) {

    if (underscore.isString(newInstanceType) === false
            || underscore.isString(newInstanceId) === false) {
        throw "Must define an instance type and id for each server. Union should be unique."
    }

    instanceType = newInstanceType;
    instanceId = newInstanceId;

    var console_t = new (winston.transports.Console)({colorize: 'true'});
    winston.loggers.add('color', {
        transports: [
            console_t
        ]
    });

    // Only include full logging if we're release.
    if (config.release === true) {
        var file_t = new (winston.transports.File)({
            filename: config.logFileDirectory + '/' + instanceType + "-" + instanceId + '.log',
            maxsize: 1024 * 1024
        });

        var loggly_t = new (winston.transports.Loggly)(config.logglyparameters);
        var papertrail_t = new Papertrail(config.papertrailparameters);

        winston.loggers.add('standard', {
            transports: [
                file_t,
                papertrail_t
            ]
        });

        winston.loggers.add('json', {
            transports: [
                loggly_t
            ]
        });
    }

    log_color = winston.loggers.get('color');
    log_standard = winston.loggers.get('standard');
    log_json = winston.loggers.get('json');
};




/** parameters:
 * 
 *  any of the req/res paramaters
 *  
 *  Or:
 *  transactionid
 *  serverid
 *  
 * 
 * @type type
 */
exports.log = {
    debug: function(message, parameters) {
        if (config.release === false) {
            message = 'DEBUG: ' + message
            var attributes = ExtractConsoleAttributes(message, parameters);
            log_color.info(CreateConsoleColorString(attributes));
        }
    },
    info: function(message, parameters) {
        var attributes = ExtractConsoleAttributes(message, parameters);
        // Add space to vertically align with longer error text.
        log_color.info(' ' + CreateConsoleColorString(attributes));
        if (config.release === true) {
            log_standard.info(CreateConsolePlainString(attributes));
            log_json.info(JSON.stringify(attributes));
        }
    },
    warn: function(message, parameters) {
        var attributes = ExtractConsoleAttributes(message, parameters);

        log_color.warn(' ' + CreateConsoleColorString(attributes));
        if (config.release === true) {
            log_standard.warn(CreateConsolePlainString(attributes));
            log_json.warn(JSON.stringify(attributes));
        }
    },
    error: function(message, parameters) {
        var attributes = ExtractConsoleAttributes(message, parameters);

        log_color.error(CreateConsoleColorString(attributes));
        if (config.release === true) {
            log_standard.error(CreateConsolePlainString(attributes));
            log_json.error(JSON.stringify(attributes));
        }
    }

};

var colorFormatting = {
    'bold': ['\x1B[1m', '\x1B[22m'],
    'italic': ['\x1B[3m', '\x1B[23m'],
    'underline': ['\x1B[4m', '\x1B[24m'],
    'inverse': ['\x1B[7m', '\x1B[27m'],
    'strikethrough': ['\x1B[9m', '\x1B[29m'],
//grayscale
    'white': ['\x1B[37m', '\x1B[39m'],
    'grey': ['\x1B[90m', '\x1B[39m'],
    'black': ['\x1B[30m', '\x1B[39m'],
//colors
    'blue': ['\x1B[34m', '\x1B[39m'],
    'cyan': ['\x1B[36m', '\x1B[39m'],
    'green': ['\x1B[32m', '\x1B[39m'],
    'magenta': ['\x1B[35m', '\x1B[39m'],
    'red': ['\x1B[31m', '\x1B[39m'],
    'yellow': ['\x1B[33m', '\x1B[39m']
};


exports.logger = function() {
    return function logger(req, res, next) {
        req._startTime = new Date;

        var logRequest = function() {
            res.removeListener('finish', logRequest);
            res.removeListener('close', logRequest);
            var attributes = ExtractHttpAttributes(req, res);

            // Make sure not log common events that aren't meaningful.
            if (attributes["statuscode"] !== 304
                    && res.staticResource !== true) {
                log_color.info(CreateHttpColorString(attributes));
                if (config.release === true) {
                    log_standard.info(CreateHttpPlainString(attributes));
                    log_json.info(JSON.stringify(attributes));
                }
            }
        };

        res.on('finish', logRequest);
        res.on('close', logRequest);

        next();
    };
};

var CreateHttpColorString = function(parameters) {
    var statusColor = colorFormatting['green'][0];

    if (parameters["status"] >= 500) {
        statusColor = colorFormatting['red'][0];
    } else if (parameters["status"] >= 400) {
        statusColor = colorFormatting['yellow'][0];
    } else if (parameters["status"] >= 300) {
        statusColor = colorFormatting['cyan'][0];
    }

    var method = "";
    if (parameters["method"] === "POST" || parameters["method"] === "PUT") {
        method = colorFormatting['yellow'][0] + parameters["method"];
    } else if (parameters["method"] === "GET") {
        method = colorFormatting['green'][0] + parameters["method"];
    } else if (parameters["method"] === "DELETE") {
        method = colorFormatting['magenta'][0] + parameters["method"];
    } else {
        method = colorFormatting['red'][0] + parameters["method"];
    }

    var date = moment().format("MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    return colorFormatting['grey'][0] + instanceType + " "
            + colorFormatting['white'][0] + instanceId + " "
            + colorFormatting['grey'][0] + date + " "
            + colorFormatting['white'][0] + time + " "
            + colorFormatting['blue'][0] + "<" + parameters["userdisplayname"] + ">"
            + colorFormatting['grey'][0] + ":"
            + colorFormatting['green'][0] + method
            + colorFormatting['grey'][0] + ' ' + parameters["originalurl"] + ' '
            + statusColor + parameters["statuscode"] + ' '
            + colorFormatting['white'][0] + parameters["responsetime"] + 'ms '
            + colorFormatting['grey'][0] + parameters["responselength"]
            + colorFormatting['white'][0];
};

var CreateHttpPlainString = function(parameters) {
    var date = moment().format("YYYY-MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    return date + " " + time + " "
            + "<" + parameters["userdisplayname"] + ">"
            + ":" + parameters["method"]
            + ' ' + parameters["originalurl"] + ' '
            + parameters["statuscode"]
            + parameters["responsetime"] + 'ms '
            + parameters["responselength"];
};


var CreateConsoleColorString = function(parameters) {
    var date = moment().format("MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    return colorFormatting['grey'][0] + parameters['instancetype'] + " "
            + colorFormatting['white'][0] + parameters['instanceid'] + " "
            + colorFormatting['grey'][0] + date + " "
            + colorFormatting['white'][0] + time + " "
            + colorFormatting['grey'][0] + ":" + parameters['message']
            + colorFormatting['white'][0];
};

var CreateConsolePlainString = function(parameters) {
    var date = moment().format("YYYY-MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    return  date + " " + time
            + ":" + parameters['message'];
};



var ExtractHttpAttributes = function(req, res) {
    var len = parseInt(res.getHeader('Content-Length'), 10);

    len = isNaN(len) ? '' : len = '- ' + bytes(len);

    var result = {};
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
        result['userdisplayname'] = req.user.displayName;
        result['userid'] = req.user.id;
    }

    result["timestamp"] = moment().toISOString();
    result["type"] = "http";

    result['method'] = req.method;
    result['originalurl'] = req.originalUrl;
    result['statuscode'] = res._headerSent ? res.statusCode : null;
    result['responsetime'] = (new Date - req._startTime);
    result['responselength'] = len;
    result['referrer'] = req.headers['referer'] || req.headers['referrer'];
    result['ip'] = req.ip;
    result['xhr'] = req.xhr;
    result['remoteaddress'] = GetRemoteAddress(req);
    result['httpversion'] = req.httpVersionMajor + '.' + req.httpVersionMinor;
    result['useragent'] = req.headers['user-agent'];

    result['instancetype'] = instanceType;
    result['instanceid'] = instanceId;

    return result;
};

var ExtractConsoleAttributes = function(message, parameters) {
    var result = {};
    if (typeof parameters !== "undefined"
            && Object.prototype.toString.call(parameters) === '[object Object]') {
        result = parameters;
    }
    result["timestamp"] = moment().toISOString();
    result["type"] = "console";
    result["message"] = message;

    result['instancetype'] = instanceType;
    result['instanceid'] = instanceId;

    return result;
};

/**
 * remote address
 */

var GetRemoteAddress = function(req) {
    if (req.ip)
        return req.ip;
    var sock = req.socket;
    if (sock.socket)
        return sock.socket.remoteAddress;
    return sock.remoteAddress;
};
