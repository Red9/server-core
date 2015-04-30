var request = require('request');
var async = require('async');

var hitUrlCount = 50;
var hitLimit = 10;

// api
var requestHeaders = {
        Cookie: 'r9session=Fe26.2**cb101096197dbd8767fb2417062e2550e75e4003e6b71fbe427e2fc6f02b3648*jHKaHO1WRqqw9388TQZtXg*ZXWSF2Vtgw6J6Zd-M9-Ohw**45d9b3527b074d1509740a3ed9d4a7b2d84cfd273c028591e7ff93dda8c0606f*_6o7mU4QsbqLa_-jWhMMjy3yTuYqqRP-e6xRSakc0YQ'
//        Cookie: 'r9session=Fe26.2**bb8cfeecfd1df0c342e778018fb2aa2ea0ba101178a94ee3b5a8a7bcbded61dc*9BR2PDHDlNcukAAu3lmKgg*2yon6P_HqU0S7BpdmRuG-A**9668292ea88f0d7fd2cbb55ae01593bed57e070a533ce9b6cea30651b6246cbf*OIgwL5OOrcPx7Z9JLKeKDZrYTM5LLGEXa8kh55WK2VU'
    };

function calculateMilliseconds(startTime){
    var diffTime = process.hrtime(startTime);
    var milliseconds = diffTime[0] * 1000 + Math.floor(diffTime[1]/1000000);
    return milliseconds;
}

function hitUrl(url, callback){
    var startTime = process.hrtime();
    request({
        url: url,
        json: true,
        headers: requestHeaders
    }, function(err, response, body){
        if (err || response.statusCode !== 200) {
            console.log('Error: ' + err);
            console.log(body);
            callback(true);
        } else {
            //var diffTime = process.hrtime(startTime);
            //var milliseconds = diffTime[0] * 1000 + Math.floor(diffTime[1]/1000000);
            var milliseconds = calculateMilliseconds(startTime);
            callback(null, milliseconds);
        }
    });
}

var urls = [
    "https://api.redninesensor.com/dataset/?expand=user",
    "https://api.redninesensor.com/user/", 
    "https://api.redninesensor.com/event/",
    "https://api.redninesensor.com/dataset/371/json?rows=1000&startTime=1421519759910&endTime=1421522591904"
];

//var urls = [
//    "https://ghost.redninesensor.com/dataset/?expand=user",
//    "https://ghost.redninesensor.com/user/", 
//    "https://ghost.redninesensor.com/event/",
//    "https://ghost.redninesensor.com/dataset/371/json?rows=1000&startTime=1421519759910&endTime=1421522591904"
//];

// Times limit isn't in async yet, so manually add it.
// Taken from https://github.com/caolan/async/pull/560
async.timesLimit = function (count, limit, iterator, callback) {
    var counter = [];
    for (var i = 0; i < count; i++) {
        counter.push(i);
    }
    return async.mapLimit(counter, limit, iterator, callback);
};

async.eachSeries(urls, function(url, callback){
    console.log(url); // Log at the top so that we see the URL while we're waiting.
    var startTime = process.hrtime();
    async.timesLimit(hitUrlCount, hitLimit, function(n, next){
        hitUrl(url, next);
        }, function(err, times){
            if(err){
                console.log('Error: ' + err);
                callback(err);
            } else {
                var minValue = Math.min.apply(Math, times);
                var maxValue = Math.max.apply(Math, times);
                var mean = times.reduce(function(a,b){ return a + b; }, 0) / times.length;
                var milliseconds = calculateMilliseconds(startTime);
                console.log('Total time: ' + Math.round(milliseconds/1000) + ' seconds');
                console.log(minValue + ' min <<< (' + mean + ' each/' + (milliseconds/times.length) + ' avg-avg) <<< ' + maxValue + ' max'); 
                console.log(JSON.stringify(times));
                console.log();
                callback();
            }
        });
    });
