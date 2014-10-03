var underscore = require('underscore')._;
var findEvent = requireFromRoot('support/analysis/findevent');

exports.post = function(req, res, next) {
    var type = req.param('type');
    if (type === 'random') {
        res.json({message: 'Processing started'});
        findEvent.random(req.param('datasetId'), req.param('eventType'), req.param('quantity'));
    } else if (type === 'spectral') {
        res.json({message: 'Processing started'});
        findEvent.spectral({
            eventType: req.param('eventType'),
            axis: req.param('axis'),
            threshold: parseFloat(req.param('threshold')),
            windowSize: parseFloat(req.param('windowSize')),
            overlapStep: parseFloat(req.param('overlapStep')),
            datasetId: req.param('datasetId'),
            thresholdDirection: req.param('thresholdDirection'),
            mergeThreshold: parseFloat(req.param('mergeThreshold'))
        });
    } else if (type === 'session') {
        res.json({message: 'Processing started'});
        var command = req.param('command');
        var datasetId = req.param('datasetId');
        var parameters = req.body;
        delete parameters.command;
        delete parameters.datasetId;

        findEvent.session(datasetId, {
            command: command,
            parameters: underscore.reduce(parameters, function(memo, value, key) {
                var t = parseFloat(value);
                memo[key] = underscore.isNaN(t) === true ? value : t;
                return memo;
            }, {})
        });
    } else {
        next();
    }


};