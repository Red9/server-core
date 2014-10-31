var request = require('request');
var _ = require('underscore')._;
var async = require('async');

var hitUrlCount = 10;

function hitUrl(url, callback){
    var startTime = process.hrtime();
    request({
        url: url,
        json: true
    }, function(){
        var diffTime = process.hrtime(startTime);
        var milliseconds = diffTime[0] * 1000 + Math.floor(diffTime[1]/1000000);
        callback(null, milliseconds);
    });
}

var urls = [
    "http://api.redninesensor.com/user/", 
    "http://betaapi.redninesensor.com/user/", 
    "http://api.redninesensor.com/dataset/?expand=owner", 
    "http://betaapi.redninesensor.com/dataset/?expand=owner",
    "http://api.redninesensor.com/event/",
    "http://betaapi.redninesensor.com/event/",
    "http://api.redninesensor.com/panel/e8347e40-e14b-9d67-8da5-8676d41d834b/body/?buckets=2000&format=json",
    "http://betaapi.redninesensor.com/dataset/62f2f038-db76-cd7e-ae8b-7030eff2d381/json?rows=2000"
]

async.eachSeries(urls, function(url, callback){
    console.log(url); // Log at the top so that we see the URL while we're waiting.
    async.timesSeries(hitUrlCount, function(n, next){
        hitUrl(url, next);
        }, function(err, times){
            var minValue = Math.min.apply(Math, times);
            var maxValue = Math.max.apply(Math, times);
            var mean = times.reduce(function(a,b){ return a + b; }, 0) / times.length;
            console.log(minValue + ' <<< (' + mean + ') <<< ' + maxValue + "              " + JSON.stringify(times));
            console.log();
            callback();
        });
    });
