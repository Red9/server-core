var moment = require('moment');
var underscore = require('underscore')._;
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraPanel = requireFromRoot('support/datasources/cassandra_panel');

var Bucketer = requireFromRoot('support/datasources/panelprocessors/bucketer');


function Distribution(name, valueIndex, minimum, maximum, slots) {
    var distribution = [];
    for (var i = 0; i < slots; i++) {
        distribution.push(0);
    }

    function add(value) {
        var index = Math.floor(value[valueIndex] / (maximum - minimum) * slots);
        distribution[index] += 1;
    }
    ;

    function result() {
        return {
            name: name,
            minimum: minimum,
            maximum: maximum,
            slots: slots,
            distribution: distribution
        };
    }

    return {
        add: add,
        result: result
    };
}



/** If cache is enabled:
 * - uses if buckets in cache
 * - stores buckets in cache if cache miss
 * 
 * @param {type} panelId
 * @param {type} startTime
 * @param {type} endTime
 * @param {type} buckets
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getPanel = function(parameters, callbackDone) {
    var panelId = parameters.id;
    var startTime = parameters.startTime;
    var endTime = parameters.endTime;
    var buckets = parameters.buckets;
    var panel = parameters.panel;

    var bucketer = Bucketer.new(startTime, endTime, buckets);



    cassandraPanel.getPanel(panelId, startTime, endTime,
            function(rowTime, rowData, n) {
                bucketer.processRow(rowTime, rowData);
            },
            function(err) {
                var resultRows = bucketer.processEnd();

                panel.axes.unshift('time');
                var result = {
                    labels: panel.axes,
                    startTime: startTime,
                    endTime: endTime,
                    id: panelId,
                    buckets: buckets,
                    values: resultRows
                };

                callbackDone(err, result);
            }
    );

};



/*
 var cacheQuery = 'SELECT body FROM raw_data_cache WHERE id=? AND buckets=? AND start_time=? AND end_time=?';
 var cacheParameters = [
 {
 value: panelId,
 hint: 'uuid'
 },
 {
 value: buckets,
 hint: 'int'
 },
 {
 value: startTime,
 hint: 'timestamp'
 },
 {
 value: endTime,
 hint: 'timestamp'
 }
 ];
 cassandraDatabase.execute(cacheQuery, cacheParameters, function(err, result) {
 if (err) {
 log.error('Error getting panel cache: ' + err + ', ' + err.stack);
 callbackDone('Error getting panel cache: ' + err + ', ' + err.stack);
 return;
 }
 if (typeof result.rows !== 'undefined' && result.rows.length === 1) {
 callbackDone(undefined, result.rows[0].body);
 return;
 }*/