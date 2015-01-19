var request = require('request');
var _ = require('underscore')._;
var async = require('async');

var hitUrlCount = 50;


// betaapi
//var requestHeaders = {
//        Cookie: 'Fe26.2**de0e6c0de49f92e1e069544cd787f56e11619724d8017eda5f6a02c4d07f857e*GJYHHFLWvGWhwgeb3y5PHw*IaxKo6M4MswjFKoyUp6UtBd1b-GyLCZkHMXR2nmtzkVKolKJV8ovaF5dUapaqTXt**f8afccfca768757132d1d9c9e4a417ca035d9d7e81a24ebc50a1d612f72c91e2*ZT8AJQponAGNAbhZ6uSPrdVNC49LwBhHOt-u0wDY5tM'
//    };

// api
var requestHeaders = {
        Cookie: 'Fe26.2**11ff657d291990384f362f7e48db94e7a9d4b1a0a85fddf7f5f3115876ba234a*2DVsYdyf5iSDLZAtms1rmA*C8Pbl-lmwrIew_rAcQ1FXQ**c0afd505ce73a263f0c103ad640d87d016bedd3b9656bff82d1facd75f5c46fd*KYBDuT2hdC3SQvpC1tE3sDmeEewau5xUU5PEKpZ34do'
    };

function hitUrl(url, callback){
    var startTime = process.hrtime();
    request({
        url: url,
        json: true,
        headers: requestHeaders
    }, function(){
        var diffTime = process.hrtime(startTime);
        var milliseconds = diffTime[0] * 1000 + Math.floor(diffTime[1]/1000000);
        callback(null, milliseconds);
    });
}

/*var urls = [
    "http://betaapi.redninesensor.com/dataset?count=true&expand=headPanel,owner&part=title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count",
    "http://betaapi.redninesensor.com/user/", 
    "http://betaapi.redninesensor.com/event/",
    "http://betaapi.redninesensor.com/dataset/c1b2b065-14d0-4438-ae93-ba70ff482319/json?rows=1000&startTime=1421519759910&endTime=1421522591904",
]*/

var urls = [
    "http://api.redninesensor.com/dataset/?expand=user",
    "http://api.redninesensor.com/user/", 
    "http://api.redninesensor.com/event/",
    "http://api.redninesensor.com/dataset/371/json?rows=1000&startTime=1421519759910&endTime=1421522591904"
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
