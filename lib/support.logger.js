var moment = require('moment');

var colors = {
    bold: '\x1B[1m',
    italic: '\x1B[3m',
    underline: '\x1B[4m',
    inverse: '\x1B[7m',
    strikethrough: '\x1B[9m',
//grayscale
    white: '\x1B[37m',
    grey: '\x1B[90m',
    black: '\x1B[30m',
//colors
    blue: '\x1B[34m',
    cyan: '\x1B[36m',
    green: '\x1B[32m',
    magenta: '\x1B[35m',
    red: '\x1B[31m',
    yellow: '\x1B[33m'
};

var instanceType = 'test';
var instanceId = 0;


function createConsoleColorString(level, message) {
    var date = moment().format("MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    var levelMap = {
        debug: 'blue',
        info: 'green',
        warning: 'yellow',
        error: 'red'
    };

    return colors[levelMap[level]] + level
            + colors.white + ': '
            + colors.grey + instanceType + ' '
            + colors.white + instanceId + ' '
            + colors.grey + date + ' '
            + colors.white + time + ' '
            + colors.grey + ':' + message
            + colors.white;
}

function createHttpColorString(parameters) {
    var statusColor = colors.green;

    if (parameters["status"] >= 500) {
        statusColor = colors.red;
    } else if (parameters["status"] >= 400) {
        statusColor = colors.yellow;
    } else if (parameters["status"] >= 300) {
        statusColor = colors.cyan;
    }

    var method = "";
    if (parameters["method"] === "POST" || parameters["method"] === "PUT") {
        method = colors.yellow + parameters["method"];
    } else if (parameters["method"] === "GET") {
        method = colors.green + parameters["method"];
    } else if (parameters["method"] === "DELETE") {
        method = colors.magenta + parameters["method"];
    } else {
        method = colors.red + parameters["method"];
    }

    var date = moment().format("MM-DD");
    var time = moment().format("HH:mm:ss.SSS");

    return colors.green + 'http'
            + colors.white + ': '
            + colors.grey + instanceType + " "
            + colors.white + instanceId + " "
            + colors.grey + date + " "
            + colors.white + time + " "
            + colors.blue + "<" + parameters["userdisplayname"] + ">"
            + colors.grey + ":"
            + colors.green + method
            + colors.grey + ' ' + parameters["originalurl"] + ' '
            + statusColor + parameters["statuscode"] + ' '
            + colors.white + parameters["responsetime"] + 'ms '
            + colors.grey + parameters["responselength"]
            + colors.white;
}

function extractHttpAttributes(req, res) {
    var len = parseInt(res.getHeader('Content-Length'), 10);

    len = isNaN(len) ? '' : len = '- ' + bytes(len);

    var result = {};
    try {
        result.userdisplayname = req.session.passport.user.displayName;
        result.userid = req.session.passport.user.id;
    } catch (e) { // if does not exist
        // No user
        result.userdisplayname = 'unknown';
        result.userid = '';
    }

    result.timestamp = moment().toISOString();
    result.type = "http";

    result.method = req.method;
    result.originalurl = req.originalUrl;
    result.statuscode = res._headerSent ? res.statusCode : null;
    result.responsetime = (new Date() - req._startTime);
    result.responselength = len;
    result.referrer = req.headers.referer || req.headers.referrer;
    result.ip = req.ip;
    result.xhr = req.xhr;
    result.remoteaddress = GetRemoteAddress(req);
    result.httpversion = req.httpVersionMajor + '.' + req.httpVersionMinor;
    result.useragent = req.headers['user-agent'];

    result.instancetype = instanceType;
    result.instanceid = instanceId;

    return result;
}

function logMessage(level, message) {
    console.log(createConsoleColorString(level, message));
}

exports.debug = function(message) {
    logMessage('debug', message);
};

exports.info = function(message) {
    logMessage('info', message);
};

exports.warning = function(message) {
    logMessage('warning', message);
};

exports.error = function(message) {
    logMessage('error', message);
};


exports.middleware = function(req, res, next) {
    // Make sure not log common events that aren't meaningful.
    // not logging HEAD is mostly for the uptime checkers...
    if (req.method === 'HEAD') {
        return;
    }

    req._startTime = new Date();

    function logRequest() {
        res.removeListener('finish', logRequest);
        res.removeListener('close', logRequest);
        var attributes = extractHttpAttributes(req, res);
        console.log(createHttpColorString(attributes));
    }

    res.on('finish', logRequest);
    res.on('close', logRequest);

    next();
};