
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
            thresholdDirection: req.param('thresholdDirection')
        });
    } else {
        next();
    }


};