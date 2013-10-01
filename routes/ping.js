/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


exports.get = function(req, res) {
    var spawn = require('child_process').spawn;
    var process = spawn('ping', ['-c', '8', 'www.google.com']);
    process.stdout.setEncoding('utf8');

    process.on('exit', function(code, signal) {
        console.log("Done pinging...");
        res.render('ping', {title: "Ping", result: "Result: " + process.stdout.read()});
    });
};