var database = require('./../../support/database');
var config = require('./../../config');


var ChangeUnits = function(summary, system) {
    if (typeof system === "undefined" || system === "SI") {
        return; // No units, or already in SI
    }

    if (system !== "common" && system !== "imperial") {
        return; // Can't convert them.
    }

    if (Object.prototype.toString.call(summary) === '[object Array]') {
        for (var i = 0; i < summary.length; i++) {
            ChangeUnits(summary[i], system);
        }
    } else if (Object.prototype.toString.call(summary) === '[object Object]') {
        for (var key in summary) {
            if (summary[key] !== null
                    && typeof summary[key]["value"] !== "undefined"
                    && typeof summary[key]["units"] !== "undefined"
                    && typeof config.unitsMap[summary[key]["units"]] !== "undefined") {
                summary[key]["value"] = summary[key]["value"] * config.unitsMap[summary[key]["units"]][system]["multiplier"];
                if (typeof config.unitsMap[summary[key]["units"]][system]["offset"] !== "undefined") {
                    summary[key]["value"] += config.unitsMap[summary[key]["units"]][system]["offset"];
                }
                summary[key]["units"] = config.unitsMap[summary[key]["units"]][system]["label"];
            } else {
                ChangeUnits(summary[key], system);
            }
        }
    }
};


exports.get = function(req, res, next) {
    var snippet_type = req.params.type;

    var start_time, end_time, parent, units, dataset;

    if (typeof req.param("start_time") !== "undefined") {
        start_time = req.param("start_time");
    }

    if (typeof req.param("end_time") !== "undefined") {
        end_time = req.param("end_time");
    }

    if (typeof req.param("parent") !== "undefined") {
        parent = req.param("parent");
    }

    if (typeof req.param("units") !== "undefined") {
        units = req.param("units");
    }

    if (typeof req.param('dataset') !== 'undefined') {
        dataset = req.param('dataset');
    }


    if (snippet_type === "createeventmodal") {
        var parameters = {
            layout: false,
            start_time: start_time,
            end_time: end_time,
            datasetId: dataset,
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
                {name: "Paddle In"},
                {name: "Paddle Left"},
                {name: "Paddle Right"},
                {name: "Paddle"},
                {name: "Duck Dive"},
                {name: "Wipe out"},
                {name: "Pearling"},
                {name: "Session"},
                {name: "Walk"},
                {name: "Run"},
                {name: "Stationary"}
            ]
        };
        res.render('snippets/createeventmodal', parameters);
    } else if (snippet_type === 'summarystatistics') {
        if (typeof req.param('dataset') !== 'undefined') {
            database.getConstrainedDataset({id: req.param('dataset')}, function(event) {
                if (typeof event === 'undefined') {
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
                        };
                        res.render('snippets/summarystatistics', parameters);
                    }
                }
            });
        }
    } else if (snippet_type === "usrmodal") {
        var parameters = {
            layout: false
        };

        res.render('snippets/usrmodal', parameters);
    } else {
        next();
    }



};
