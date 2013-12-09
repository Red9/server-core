var database = require('./../support/database');
var config = require('./../config');


var ChangeUnits = function(summary, system) {
    if (typeof system === "undefined" || system === "SI") {
        return;
    }

    for (var key in summary) {
        if(key === "0"){
            return;
        }
        //console.log("key: " + key);
        if (typeof summary[key]["value"] !== "undefined"
                && typeof summary[key]["units"] !== "undefined"
                && typeof config.unitsMap[summary[key]["units"]] !== "undefined") {
            //console.log("Remapping to " + config.unitsMap[summary[key]["units"]][system]["label"]);
            //console.log("value: " + summary[key]["value"] + " * " + config.unitsMap[summary[key]["units"]][system]["multiplier"] + "");
            summary[key]["value"] = summary[key]["value"] * config.unitsMap[summary[key]["units"]][system]["multiplier"];
            if(typeof config.unitsMap[summary[key]["units"]][system]["offset"] !== "undefined"){
                summary[key]["value"] += config.unitsMap[summary[key]["units"]][system]["offset"];
            }
            summary[key]["units"] = config.unitsMap[summary[key]["units"]][system]["label"];
        }else{
            ChangeUnits(summary[key], system);
        }
    }
};


exports.get = function(req, res, next) {
    var snippet_type = req.params.type;

    var start_time, end_time, parent, units;

    if (typeof req.param("startTime") !== "undefined") {
        start_time = req.param("startTime");
    }

    if (typeof req.param("endTime") !== "undefined") {
        end_time = req.param("endTime");
    }

    if (typeof req.param("parent") !== "undefined") {
        parent = req.param("parent");
    }

    if (typeof req.param("units") !== "undefined") {
        units = req.param("units");
    }


    if (snippet_type === "createeventmodal") {
        var parameters = {
            layout: false,
            start_time: start_time,
            end_time: end_time,
            parent: parent,
            EventType: [
                {name: "Default"},
                {name: "Wave: Left"},
                {name: "Wave: Right"},
                {name: "Wave"},
                {name: "Drop In"},
                {name: "Bottom Turn"},
                {name: "Snap"},
                {name: "Snap: Closeout"},
                {name: "Air Drop"},
                {name: "Cutback"},
                {name: "Floater"},
                {name: "Carve"},
                {name: "Tail Slide"},
                {name: "Pump"},
                {name: "360"},
                {name: "Reverse"},
                {name: "Air"},
                {name: "Paddle for Wave"},
                {name: "Paddle Out"},
                {name: "Paddle"},
                {name: "Duck Dive"},
                {name: "Wipe out"},
                {name: "Pearling"},
                {name: "Session"}
            ]
        };
        res.render('snippets/createeventmodal', parameters);
    } else if (snippet_type === "eventtree") {
        if (typeof req.param("id") !== "undefined") {
            var parameters = {
                layout: false,
                event: {
                    id: req.param("id")
                }
            };
            res.render('snippets/eventtree', parameters);
        }
    } else if (snippet_type === "summarystatistics") {
        if (typeof req.param("id") !== "undefined") {
            database.GetRow("event", "id", req.param("id"), function(event) {
                if (typeof event === "undefined") {
                    next();
                } else {
                    if (event.summary_statistics === '') {
                        res.status(204).send('');
                    } else {
                        if (typeof units !== "undefined") {
                            ChangeUnits(event.summary_statistics, units);
                        }

                        var parameters = {layout: false,
                            event: event,
                            measurements: config.measurements
                        }
                        res.render('snippets/summarystatistics', parameters);
                    }
                }
            });
        }

    } else {



        next();
    }



};


//res.render('report', {
//       title : 'My report'
//    , layout : false
//});

