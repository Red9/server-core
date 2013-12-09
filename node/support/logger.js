/*!
 * Connect - logger
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var bytes = require('bytes');


var winston = require('winston');
//var Loggly = require('winston-loggly').Loggly;
var Papertrail = require('winston-papertrail').Papertrail;

var moment = require('moment');

/*
 winston.loggers.add('global', {
 
 });
 
 winston.loggers.add('console', {
 console: {
 colorize: 'true'
 }
 });
 
 winston.loggers.add('full', {
 file: {
 filename: '/logs/main_log.txt'
 }
 
 });*/


var console_t = new (winston.transports.Console)({
    colorize: 'true'});
var file_t = new (winston.transports.File)({
    filename: 'logs/server.log',
    maxsize: 1024 * 1024/*,
     handleExceptions: true*/});
/*var loggly_t = new (winston.transports.Loggly)({
 subdomain:'rednine',
 inputToken:'32232891-eb88-4b91-a206-fb7cd33ed747'
 });*/

var papertrail_t = new Papertrail({
    host: 'logs.papertrailapp.com',
    port: 19395,
    colorize: true
});

winston.loggers.add('color', {
    transports: [
        console_t//,
                //papertrail_t
    ]
});

winston.loggers.add('standard', {
    transports: [
        file_t
    ]
});

winston.loggers.add('all', {
    transports: [
        console_t,
        file_t//,
                //papertrail_t
    ]
});

var log_color = winston.loggers.get('color');
var log_standard = winston.loggers.get('standard');
var log_all = winston.loggers.get('all');

//exports.log = log_all;
//exports.color = log_color;
exports.log = {
    info: function(string, req) {
        log_color.info(constructString(req, string, true));
        log_standard.info(constructString(req, string, false));
    },
    warn: function(string, req) {
        log_color.warn(constructString(req, string, true));
        log_standard.warn(constructString(req, string, false));
    },
    error: function(string, req) {
        log_color.error(constructString(req, string, true));
        log_standard.error(constructString(req, string, false));
    }
};

/** Connect middleware logger
 * Logger:
 *
 * Log requests with the given `options` or a `format` string.
 *
 * Options:
 *
 *   - `format`  Format string, see below for tokens
 *   - `stream`  Output stream, defaults to _stdout_
 *   - `buffer`  Buffer duration, defaults to 1000ms when _true_
 *   - `immediate`  Write log line on request instead of response (for response times)
 *
 * Tokens:
 *
 *   - `:req[header]` ex: `:req[Accept]`
 *   - `:res[header]` ex: `:res[Content-Length]`
 *   - `:http-version`
 *   - `:response-time`
 *   - `:remote-addr`
 *   - `:date`
 *   - `:method`
 *   - `:url`
 *   - `:referrer`
 *   - `:user-agent`
 *   - `:status`
 *
 * Formats:
 *
 *   Pre-defined formats that ship with connect:
 *
 *    - `default` ':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
 *    - `short` ':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'
 *    - `tiny`  ':method :url :status :res[content-length] - :response-time ms'
 *    - `dev` concise output colored by response status for development use
 *
 * Examples:
 *
 *      connect.logger() // default
 *      connect.logger('short')
 *      connect.logger('tiny')
 *      connect.logger({ immediate: true, format: 'dev' })
 *      connect.logger(':method :url - :referrer')
 *      connect.logger(':req[content-type] -> :res[content-type]')
 *      connect.logger(function(tokens, req, res){ return 'some format string' })
 *
 * Defining Tokens:
 *
 *   To define a token, simply invoke `connect.logger.token()` with the
 *   name and a callback function. The value returned is then available
 *   as ":type" in this case.
 *
 *      connect.logger.token('type', function(req, res){ return req.headers['content-type']; })
 *
 * Defining Formats:
 *
 *   All default formats are defined this way, however it's public API as well:
 *
 *       connect.logger.format('name', 'string or function')
 *
 * @ param {String|Function|Object} format or options
 * @ return {Function}
 * @ api public
 */

// + '\x1b[m'

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
}

var constructString = function(req, content, colorize) {
    var date = moment().format("YYYY-MM-DD");
    var time = moment().format("HH:mm:ss.SSS");
    var user = "<?>";
    if (typeof req !== "undefined") {
        if (typeof req === "string") {
            user = "<" + req + ">";
        } else if (typeof req.isAuthenticated === 'function'
                && req.isAuthenticated()) {
            user = "<" + req.user.display_name + ">";
        }
    }
    if (colorize === true) {
        return    colorFormatting['grey'][0] + date + " "
                + colorFormatting['white'][0] + time + " "
                + colorFormatting['blue'][0] + user
                + colorFormatting['grey'][0] + ":" + content
                + colorFormatting['white'][0];
    } else {
        return date + " " + time + " " + user + ":" + content;
    }
};

var logRequestPart = function(req, res, fmt, log, console) {
    var line = fmt(exports, req, res);
    if (line === null) {
        return;
    }

    //var datetime = moment().format("YYYY-MM-DD HH:mm:ss");
    /*
     if (req.isAuthenticated()) {
     var display_name = req.user.display_name;
     var id = req.user.id;
     
     line = datetime + " user:+++" + display_name + "+++(" + id + ") " + line;
     
     } else {
     line = datetime + " " + line;
     }*/

    line = constructString(req, line, console);

    if (console === true) {
        line = '\x1b[90m' + line;
    }

    var status = res.statusCode;
    if (status === 304) {
        // Do nothing
    } else if (status >= 500) {
        log.error(line);
    } else if (status >= 400) {
        log.warn(line);
    } else {
        log.info(line);
    }

};

exports.logger = function(options) {
    if ('object' == typeof options) {
        options = options || {};
    } else if (options) {
        options = {format: options};
    } else {
        options = {};
    }

    // format name
    var dev_fmt = exports['dev'];
    // compile format
    if ('function' !== typeof dev_fmt) {
        dev_fmt = compile(dev_fmt);
    }

    var full_fmt = exports['default'];
    if ('function' !== typeof full_fmt) {
        full_fmt = compile(full_fmt);
    }

    return function logger(req, res, next) {
        req._startTime = new Date;

        function logRequest() {
            res.removeListener('finish', logRequest);
            res.removeListener('close', logRequest);
            logRequestPart(req, res, dev_fmt, log_color, true);
            logRequestPart(req, res, full_fmt, log_standard, false);
        }
        ;


        res.on('finish', logRequest);
        res.on('close', logRequest);

        next();
    };
};

/**
 * Compile `fmt` into a function.
 *
 * @param {String} fmt
 * @return {Function}
 * @api private
 */

function compile(fmt) {
    fmt = fmt.replace(/"/g, '\\"');
    var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg) {
        return '"\n    + (tokens["' + name + '"](req, res, "' + arg + '") || "-") + "';
    }) + '";'
    return new Function('tokens, req, res', js);
}
;

/**
 * Define a token function with the given `name`,
 * and callback `fn(req, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Object} exports for chaining
 * @api public
 */

exports.token = function(name, fn) {
    exports[name] = fn;
    return this;
};

/**
 * Define a `fmt` with the given `name`.
 *
 * @param {String} name
 * @param {String|Function} fmt
 * @return {Object} exports for chaining
 * @api public
 */

exports.format = function(name, str) {
    exports[name] = str;
    return this;
};

/**
 * Default format.
 */

exports.format('default', ':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"');

/**
 * Short format.
 */

exports.format('short', ':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms');

/**
 * Tiny format.
 */

exports.format('tiny', ':method :url :status :res[content-length] - :response-time ms');

/**
 * dev (colored)
 */

exports.format('dev', function(tokens, req, res) {
    var status = res.statusCode
            , len = parseInt(res.getHeader('Content-Length'), 10)
            , color = 32; //Green

    if (status >= 500)
        color = 31; //Red
    else if (status >= 400)
        color = 33; //Yellow
    else if (status >= 300)
        color = 36; //cyan

    len = isNaN(len)
            ? ''
            : len = ' - ' + bytes(len);
        
    var method = "";
    if(req.method === "POST" || req.method === "PUT"){
        method = colorFormatting['yellow'][0] + req.method;
    }else if(req.method === "GET"){
        method = colorFormatting['green'][0] + req.method;
    }else if(req.method === "DELETE"){
        method = colorFormatting['magenta'][0] + req.method;
    }else{
        method = colorFormatting['red'][0] + req.method;
    }

    return method + colorFormatting['grey'][0]
            + ' ' + req.originalUrl + ' '
            + '\x1b[' + color + 'm' + res.statusCode
            + ' \x1b[90m'
            + (new Date - req._startTime)
            + 'ms' + len
            + '\x1b[0m';
});

/**
 * request url
 */

exports.token('url', function(req) {
    return req.originalUrl || req.url;
});

/**
 * request method
 */

exports.token('method', function(req) {
    return req.method;
});

/**
 * response time in milliseconds
 */

exports.token('response-time', function(req) {
    return new Date - req._startTime;
});

/**
 * UTC date
 */

exports.token('date', function() {
    return new Date().toUTCString();
});

/**
 * response status code
 */

exports.token('status', function(req, res) {
    return res.headerSent ? res.statusCode : null;
});

/**
 * normalized referrer
 */

exports.token('referrer', function(req) {
    return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */

exports.token('remote-addr', function(req) {
    if (req.ip)
        return req.ip;
    var sock = req.socket;
    if (sock.socket)
        return sock.socket.remoteAddress;
    return sock.remoteAddress;
});

/**
 * HTTP version
 */

exports.token('http-version', function(req) {
    return req.httpVersionMajor + '.' + req.httpVersionMinor;
});

/**
 * UA string
 */

exports.token('user-agent', function(req) {
    return req.headers['user-agent'];
});

/**
 * request header
 */

exports.token('req', function(req, res, field) {
    return req.headers[field.toLowerCase()];
});

/**
 * response header
 */

exports.token('res', function(req, res, field) {
    return (res._headers || {})[field.toLowerCase()];
});

