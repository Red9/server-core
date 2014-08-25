

var moment = require('moment');

var resourceCommon = require('./resourcecommon');

var defaultSource = {
    type: 'manual',
    createTime: '', // Overwritten in pre
    algorithm: 'manual',
    parameters: {}
};

var eventResource = {
    startTime: {
        type: 'timestamp',
        includeToCreate: true,
        editable: true
    },
    endTime: {
        type: 'timestamp',
        includeToCreate: true,
        editable: true
    },
    type: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    datasetId: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    //-------------------------
    source: {
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    summaryStatistics: {
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    }
};

var eventSchemaHint = {
    id: 'uuid',
    dataset: 'uuid',
    start_time: 'timestamp',
    end_time: 'timestamp',
    type: 'varchar',
    summary_statistics: 'varchar',
    source: 'varchar'
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset = resource.datasetId;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);
    cassandra.type = resource.type;
    cassandra.source = JSON.stringify(resource.source);

    if (typeof resource.startTime !== 'undefined') {
        cassandra.start_time = moment(resource.startTime).toDate();
    }
    if (typeof resource.endTime !== 'undefined') {
        cassandra.end_time = moment(resource.endTime).toDate();
    }

    underscore.each(cassandra, function(value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });
    return cassandra;
}



function calculateStar(cse) {
    var range = [
        260.04,
        98.24,
        45.165,
        16.58
    ];
    var i;
    for (i = 0; i < range.length; i++) {
        if (Math.abs(cse) > range[i]) {
            break;
        }
    }

    return range.length - i + 1;
}

function addStars(resource) {
    var result = {};

    try {
        underscore.each(resource.summaryStatistics.static.cse.axes,
                function(cse, axis) {
                    result[axis] = calculateStar(cse);
                });
    } catch (e) {
        //log.warn('Caught: ' + e + ', ' + JSON.stringify(resource));
    }
    return result;
}

function mapToResource(cassandra, callback) {
    var resource = {};

    resource.id = cassandra.id;
    resource.datasetId = cassandra.dataset;
    resource.endTime = cassandra.end_time;
    resource.startTime = cassandra.start_time;

    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        // Catch if it is undefined.
        resource.summaryStatistics = {};
    }

    try {
        resource.source = JSON.parse(cassandra.source);
    } catch (e) {
        resource.source = {};
    }

    resource.type = cassandra.type;


    resource.stars = addStars(resource);

    callback(resource);
}





/*
Most important queries:
1. By ID
2. By dataset ID
3. By type
4. By startTime, endTime

*/

/**
 * Options include:
 * - filters {}
 * - expand ???
 * - orderBy
 * - limit
 * - page
 * 
 * 
 * find(query, [projection,] options)
 * 
 * @param {type} options
 * @returns {undefined}
 */
exports.find = function() {
    
    var query = arguments[0];
    var options = arguments[arguments.length -1];
    var projection = arguments.length >= 3 ? arguments[2] : {};
    
    
    
    
    
    
    var queryString = 'SELECT * FROM event'
    + whereQuery + ' ALLOW FILTERING';
   
    
    

    cassandra.execute({
        query: query,
        mapToResource: mapToResource,
        paramaters: [],
        rowCallback: options.rowCallback,
        doneCallback: options.doneCallback,
        errorCallback: options.errorCallback
    });
};





exports.create = function(newEvent){
    
};