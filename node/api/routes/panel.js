var database = require('./../../support/database');
var underscore = require('underscore')._;

exports.search = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};


/*
 * "labels": [
    "time",
    "acceleration:x",
    "acceleration:y",
    "acceleration:z"
  ],
"values":[
// Array stuff...
]

 */

exports.get = function(req, res, next) {

    var format = 'csv';
    if (req.query['format'] === 'json') {
        format = 'json';
    }

    var firstRow = true;
    database.getPanel(req.param('id'), req.query,
            function(dataset, columns) {

                if (format === 'csv') {
                    res.write('time');
                    underscore.each(columns, function(value, index, list) {
                        res.write("," + value);
                    });
                    res.write("\n");
                } else if (format === 'json') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    
                    columns.unshift("time");
                    
                    var start = '{"labels":' + JSON.stringify(columns) + ',"values":[\n';
                    
                    res.write(start);
                    
                    
                }
            },
            function(row) {
                if (format === 'csv') {
                    res.write(row + "\n");
                } else if (format === 'json') {
                    if (firstRow === false) {
                        res.write(",\n" + JSON.stringify(row));
                    } else {
                        res.write(JSON.stringify(row));
                        firstRow = false;
                    }

                }
            },
            function(err) {
                if(format === 'csv'){
                    
                }else if(format === 'json'){
                    res.write(']}');
                }
        
                res.end();
            });
    //res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.create = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.update = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};
