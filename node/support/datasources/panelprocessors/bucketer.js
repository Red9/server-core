"use strict";

var underscore = require('underscore')._;
var log = requireFromRoot('support/logger').log;

function Bucket(time) {
    this.includeMinMax = true;
    this.resetBucket(time);
}

Bucket.prototype.resetBucket = function(time) {
    this.time = time;
    this.count = 0;

    this.sum = undefined;
    this.minimum = undefined;
    this.maximum = undefined;
};

Bucket.prototype.addRow = function(newValues) {
    this.count = this.count + 1;

    if (typeof this.minimum === 'undefined') {
        // Called for the first time
        this.sum = [];
        if (this.includeMinMax === true) {
            this.minimum = [];
            this.maximum = [];
        }

        underscore.each(newValues, function(value) {
            this.sum.push(value);
            if (this.includeMinMax === true) {
                this.minimum.push(value);
                this.maximum.push(value);
            }
        }, this);
    } else {
        // Called each subsequent time
        underscore.each(newValues, function(value, index) {
            this.sum[index] += value;
            if (this.includeMinMax === true) {
                if (this.minimum[index] > value) {
                    this.minimum[index] = value;
                }
                if (this.maximum[index] < value) {
                    this.maximum[index] = value;
                }
            }
        }, this);
    }
};

Bucket.prototype.getResultRow = function() {
    var result = [];

    underscore.each(this.sum, function(sum, index) {
        var average = sum / this.count;
        if (this.includeMinMax === true) {
            result.push([
                this.minimum[index],
                average,
                this.maximum[index]
            ]);
        } else {
            result.push(average);
        }
    }, this);
    return result;
};

Bucket.prototype.getTime = function() {
    return this.time;
};

Bucket.prototype.hasData = function() {
    return this.count !== 0;
};





exports.new = function(startTime, endTime, buckets) {
    var panelDuration = endTime - startTime;
    var bucketDuration = Math.floor(panelDuration / buckets);
    if (bucketDuration === 0) {
        bucketDuration = 1; // Minimum 1ms buckets
    }
    var currentBucketStartTime = startTime;
    var bucket = new Bucket(currentBucketStartTime);

    var rows = [];

    function processRow(rowTime, rowData) {
        // While loop to account for empty buckets.
        while (rowTime > currentBucketStartTime + bucketDuration) {
            if (bucket.hasData() === true) {
                var bucketTime = bucket.getTime();
                var bucketDataRow = bucket.getResultRow();

                bucketDataRow.unshift(bucketTime);
                rows.push(bucketDataRow);
            }
            currentBucketStartTime = currentBucketStartTime + bucketDuration;
            bucket.resetBucket(currentBucketStartTime);
        }
        bucket.addRow(rowData);
    }
    function processEnd() {
        // Send last bucket
        var bucketTime = bucket.getTime();
        var bucketDataRow = bucket.getResultRow();

        bucketDataRow.unshift(bucketTime);
        rows.push(bucketDataRow);

        return rows;
    }

    return {
        processRow: processRow,
        processEnd: processEnd
    };
};