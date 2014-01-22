
var spawn = require('child_process').spawn;
var config = require('./../../config');


var OperateOperator = function(options, donecallback) {
    console.log("Operator Function");
    var parameters = [];
    parameters.push('-jar');
    parameters.push('bin/operator.jar');
    parameters.push('--usrpath');
    parameters.push(config.usr_directory);

    var output_writes = "";

    if (options["operation"] === "list usrs") {
        console.log("list usrs");
        parameters.push('--listparameters');
    } else if (options["operation"] === "get form") {
        console.log("output form");
        parameters.push('--outputform');
        parameters.push('--usr');
        parameters.push(options["id"]);
    } else if (options["operation"] === "operate") {
        console.log("operate");
        parameters.push('--usr');
        parameters.push(options["id"]);
        output_writes += JSON.stringify(options["marked"]) + "\n";
        output_writes += JSON.stringify(options["form"]) + "\n\n";
    } else {
        console.log("Operation not supported!");
        donecallback({});
        return;
    }



    var operator = spawn('java', parameters);

/*
    if (options["operation"] === "operate") {
        operator.stderr.on('data', function(data) {
            console.log("New stderr: '" + data + "'");
        });

        operator.stdout.on('data', function(data) {
            console.log("New stdout: '" + data + "'");

        });
    }*/

    console.log("Data to write to stdin: '" + output_writes + "'");
    console.log("Wrote all data to stdin: " + operator.stdin.write(output_writes));


  /*  operator.on('error', function(err) {
        console.log("Error in operator: '" + err + "'");
    });

    operator.on('close', function(code, signal) {
        console.log("Operator closed with code " + code);
    });
*/
    operator.on('exit', function(code, signal) {
        console.log("Exit A");
        operator.stdout.setEncoding("utf8");
        operator.stderr.setEncoding("utf8");

        console.log("Exit B");
        var stdout = operator.stdout.read();
        var stderr = operator.stderr.read();

        console.log("Exit C");
        if (stdout === null) {
            stdout = "";
        }
        if (stderr === null) {
            stderr = "";
        }

        console.log("Exit D");
        console.log("Operator stdout: " + stdout);
        console.log("Operator stderr: " + stderr);

        if (code !== 0) {
            console.log("Non-zero exit!");
            donecallback({});

        } else {
            console.log("Operator done.");
            var stdoutlines = stdout.split("\n");

            var stderrlines = stderr.split("\n");


            var callback_param = {
                stdout: stdoutlines,
                stderr: stderrlines
            };

            donecallback(callback_param);
        }
    });
    console.log("Set up exit function...");
};



exports.getlist = function(req, res, next) {
    OperateOperator({operation: "list usrs"}, function(result) {
        res.json(JSON.parse(result["stdout"][0]));
    });
};

exports.getusrform = function(req, res, next) {
    OperateOperator({operation: "get form", id: "1a3d9287-82bb-46dd-8a5c-6a1a337bfffd"}, function(result) {
        res.json(JSON.parse(result["stdout"][0]));
        //res.json(JSON.parse('{"schema":{"starttime":{"type":"object","title":"Start Time","properties":{"selected":{"type":"checkbox","title":"Apply Start Time"},"date":{"type":"date","title":"Date"},"hour":{"type":"integer","title":"hour","minimum":1,"maximum":23,"default":1},"minute":{"type":"integer","title":"minute","minimum":0,"maximum":59,"default":2},"second":{"type":"number","title":"second","minimum":0,"maximum":59.999,"default":3.456}}},"endtime":{"type":"object","title":"End Time","properties":{"selected":{"type":"checkbox","title":"Apply End Time"},"date":{"type":"date","title":"Date"},"hour":{"type":"integer","title":"hour","minimum":1,"maximum":23,"default":1},"minute":{"type":"integer","title":"minute","minimum":0,"maximum":59,"default":2},"second":{"type":"number","title":"second","minimum":0,"maximum":59.999,"default":3.456}}}},"form":[{"type":"help","helpvalue":"Specify the start time and/or the end time of the dataset. If only one is specified then the dataset is shifted. If both are specified then the dataset is both shifted and stretched (or compressed)."},"starttime","endtime",{"type":"help","helpvalue":"<strong>Click on <em>Submit</em></strong> when you\'re done"},{"type":"submit","title":"Submit"}]}'));
    });

};

exports.operateusr = function(req, res, next) {
    //console.log("Got post request: " + JSON.stringify(req.body));

    var form = req.body["form"];
    var marked = req.body["marked"];
    var id = req.body["id"];

    //TODO(SRLM): Add a check here to validate the variables from the user.

    OperateOperator({operation: "operate", form: form, marked: marked, id: id}, function(result) {

    });

    var reply = {};
    //res.json(reply);
    res.json(JSON.parse('["Hello, World"]'));
};